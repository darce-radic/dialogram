import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueWebhook } from '@/lib/queue/webhook-queue'

/**
 * Dispatch webhook events to all active agent keys in a workspace
 * that have a webhook_url configured.
 *
 * Fire-and-forget — errors are caught silently so they never
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

    await Promise.all(
      keys.map((key) =>
        enqueueWebhook({
          id: randomUUID(),
          type: eventType,
          workspace_id: workspaceId,
          payload,
          webhook_url: key.webhook_url!,
          signing_secret: key.webhook_secret ?? '',
        })
      )
    )
  } catch {
    // Silent — webhook dispatch should never break API responses
  }
}
