import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit'
import {
  incrementSecurityMetric,
  logSecurityEvent,
} from '@/lib/security/audit'
import type { AgentKey } from '@shared/types'

export interface AgentAuthResult {
  authenticated: boolean
  agentKey?: AgentKey
  rateLimited?: boolean
  retryAfterSeconds?: number
}

/**
 * Authenticate an agent via API key from the Authorization header.
 * Expects: `Authorization: Bearer dlg_xxx`
 *
 * Uses the admin client (service role) to bypass RLS,
 * since agent keys are verified by hash — not user session.
 */
export async function authenticateAgent(
  authHeader: string | null,
  request?: Request
): Promise<AgentAuthResult> {
  if (request) {
    const ip = getClientIp(request)
    const headerFingerprint = createHash('sha256')
      .update(authHeader ?? '')
      .digest('hex')
      .slice(0, 16)
    const rl = checkRateLimit({
      key: `agent-auth:${ip}:${headerFingerprint}`,
      limit: 120,
      windowMs: 60_000,
    })
    if (!rl.ok) {
      incrementSecurityMetric('agent_auth.rate_limited')
      logSecurityEvent('agent_auth.rate_limited', {
        ip,
        retry_after_seconds: rl.retryAfterSeconds,
      })
      return {
        authenticated: false,
        rateLimited: true,
        retryAfterSeconds: rl.retryAfterSeconds,
      }
    }
  }

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
