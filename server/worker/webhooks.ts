import { createHmac } from "node:crypto";

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
  const body = JSON.stringify({
    id: event.id,
    type: event.type,
    workspace_id: event.workspace_id,
    payload: event.payload,
    created_at: event.created_at,
  });

  const signature = signPayload(body, event.signing_secret);

  try {
    const response = await fetch(event.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Dialogram-Signature": `sha256=${signature}`,
        "X-Dialogram-Event": event.type,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
