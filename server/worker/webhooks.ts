import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";

// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------
export interface WebhookEvent {
  id: string;
  type: string;
  workspace_id: string;
  payload: Record<string, unknown>;
  webhook_url: string;
  signing_secret: string;
  created_at: string;
}

const MAX_REDIRECTS = 3;

function logSecurity(event: string, payload: Record<string, unknown> = {}) {
  console.warn(
    JSON.stringify({
      ts: new Date().toISOString(),
      category: "security",
      event,
      ...payload,
    })
  );
}

function isPrivateOrLocalIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

function isPrivateOrLocalIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  if (normalized.startsWith("::ffff:")) {
    const v4 = normalized.replace("::ffff:", "");
    return isPrivateOrLocalIpv4(v4);
  }
  return false;
}

function isLocalOrPrivateIp(ip: string): boolean {
  if (ip.includes(":")) return isPrivateOrLocalIpv6(ip);
  return isPrivateOrLocalIpv4(ip);
}

async function assertDnsTargetIsPublic(hostname: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const records = await lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { ok: false, error: "DNS lookup returned no addresses" };
    }

    for (const record of records) {
      if (isLocalOrPrivateIp(record.address)) {
        return {
          ok: false,
          error: `DNS resolved to private/local address: ${record.address}`,
        };
      }
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "DNS lookup failed" };
  }
}

async function validateWebhookTarget(url: URL, event: WebhookEvent): Promise<{ ok: true } | { ok: false; error: string }> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Webhook URL must use http or https" };
  }

  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    return { ok: false, error: "Webhook URL targets a local hostname" };
  }

  if (isLocalOrPrivateIp(url.hostname)) {
    return { ok: false, error: "Webhook URL targets a private/local IP" };
  }

  const dnsCheck = await assertDnsTargetIsPublic(url.hostname);
  if (!dnsCheck.ok) {
    logSecurity("webhook.delivery.blocked", {
      reason: dnsCheck.error,
      event_id: event.id,
      workspace_id: event.workspace_id,
      hostname: url.hostname,
    });
    return { ok: false, error: dnsCheck.error };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 payload signing
// ---------------------------------------------------------------------------
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// ---------------------------------------------------------------------------
// Deliver a single webhook with retry
// ---------------------------------------------------------------------------
export async function deliverWebhook(
  event: WebhookEvent
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  if (!event.signing_secret || event.signing_secret.trim().length < 32) {
    const error = "Missing or weak webhook signing secret";
    logSecurity("webhook.delivery.blocked", {
      reason: error,
      event_id: event.id,
      workspace_id: event.workspace_id,
    });
    return { success: false, error };
  }

  let currentUrl: URL;
  try {
    currentUrl = new URL(event.webhook_url);
  } catch {
    const error = "Invalid webhook URL";
    logSecurity("webhook.delivery.blocked", {
      reason: error,
      event_id: event.id,
      workspace_id: event.workspace_id,
      webhook_url: event.webhook_url,
    });
    return { success: false, error };
  }

  const body = JSON.stringify({
    id: event.id,
    type: event.type,
    workspace_id: event.workspace_id,
    payload: event.payload,
    created_at: event.created_at,
  });

  const signature = signPayload(body, event.signing_secret);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const targetValidation = await validateWebhookTarget(currentUrl, event);
    if (!targetValidation.ok) {
      logSecurity("webhook.delivery.blocked", {
        reason: targetValidation.error,
        event_id: event.id,
        workspace_id: event.workspace_id,
        webhook_url: currentUrl.toString(),
      });
      return { success: false, error: targetValidation.error };
    }

    try {
      const response = await fetch(currentUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Dialogram-Signature": `sha256=${signature}`,
          "X-Dialogram-Event": event.type,
        },
        body,
        signal: AbortSignal.timeout(10_000),
        redirect: "manual",
      });

      const isRedirect = response.status >= 300 && response.status < 400;
      if (isRedirect) {
        const location = response.headers.get("location");
        if (!location) {
          const error = "Redirect response missing location header";
          logSecurity("webhook.delivery.failed", {
            event_id: event.id,
            workspace_id: event.workspace_id,
            status_code: response.status,
            reason: error,
          });
          return { success: false, statusCode: response.status, error };
        }

        if (redirects === MAX_REDIRECTS) {
          const error = "Too many redirects";
          logSecurity("webhook.delivery.failed", {
            event_id: event.id,
            workspace_id: event.workspace_id,
            status_code: response.status,
            reason: error,
          });
          return { success: false, statusCode: response.status, error };
        }

        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (!response.ok) {
        logSecurity("webhook.delivery.failed", {
          event_id: event.id,
          workspace_id: event.workspace_id,
          status_code: response.status,
        });
      }

      return {
        success: response.ok,
        statusCode: response.status,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      logSecurity("webhook.delivery.error", {
        event_id: event.id,
        workspace_id: event.workspace_id,
        error,
      });
      return {
        success: false,
        error,
      };
    }
  }

  return { success: false, error: "Unexpected redirect handling state" };
}
