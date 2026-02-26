import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueWebhook } from '@/lib/queue/webhook-queue'
import {
  incrementSecurityMetric,
  logSecurityEvent,
} from '@/lib/security/audit'

/**
 * Dispatch webhook events to all active agent keys in a workspace
 * that have a webhook_url configured.
 *
 * Fire-and-forget - errors are caught so they never
 * break the calling API response.
 */
export async function dispatchWebhooks(
  workspaceId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: keys } = await admin
      .from('agent_keys')
      .select('webhook_url, webhook_secret')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .not('webhook_url', 'is', null)

    if (!keys || keys.length === 0) return

    const validKeys = keys.filter(
      (key) =>
        typeof key.webhook_url === 'string' &&
        key.webhook_url.length > 0 &&
        typeof key.webhook_secret === 'string' &&
        key.webhook_secret.length >= 32
    )

    const skipped = keys.length - validKeys.length
    if (skipped > 0) {
      incrementSecurityMetric('webhook.dispatch.skipped_invalid_key_config', skipped)
      logSecurityEvent('webhook.dispatch.skipped_invalid_key_config', {
        workspace_id: workspaceId,
        event_type: eventType,
        skipped,
      })
    }

    await Promise.all(
      validKeys.map((key) =>
        enqueueWebhook({
          id: randomUUID(),
          type: eventType,
          workspace_id: workspaceId,
          payload,
          webhook_url: key.webhook_url as string,
          signing_secret: key.webhook_secret as string,
        })
      )
    )
  } catch {
    incrementSecurityMetric('webhook.dispatch.error')
    logSecurityEvent('webhook.dispatch.error', {
      workspace_id: workspaceId,
      event_type: eventType,
    })
    // Silent - webhook dispatch should never break API responses
  }
}
