import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentKey } from '@shared/types'

export interface AgentAuthResult {
  authenticated: boolean
  agentKey?: AgentKey
}

/**
 * Authenticate an agent via API key from the Authorization header.
 * Expects: `Authorization: Bearer dlg_xxx`
 *
 * Uses the admin client (service role) to bypass RLS,
 * since agent keys are verified by hash — not user session.
 */
export async function authenticateAgent(
  authHeader: string | null
): Promise<AgentAuthResult> {
  if (!authHeader) return { authenticated: false }

  const match = authHeader.match(/^Bearer\s+(dlg_\S+)$/i)
  if (!match) return { authenticated: false }

  const plaintextKey = match[1]
  const keyHash = createHash('sha256').update(plaintextKey).digest('hex')

  const admin = createAdminClient()

  const { data: agentKey } = await admin
    .from('agent_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single()

  if (!agentKey) return { authenticated: false }

  // Update last_used_at (fire-and-forget)
  Promise.resolve(
    admin
      .from('agent_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', agentKey.id)
  ).catch(() => {})

  return { authenticated: true, agentKey: agentKey as AgentKey }
}
