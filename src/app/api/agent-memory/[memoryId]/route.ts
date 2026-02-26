import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'

interface RouteContext {
  params: Promise<{ memoryId: string }>
}

export async function DELETE(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'agent-memory.delete',
    limit: 60,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const { memoryId } = await context.params

  const agentAuth = await authenticateAgent(
    request.headers.get('authorization'),
    request
  )
  if (agentAuth.rateLimited) {
    return NextResponse.json(
      { data: null, error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(agentAuth.retryAfterSeconds ?? 60) } }
    )
  }
  if (!agentAuth.authenticated || !agentAuth.agentKey) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const admin = createAdminClient()

  // Verify memory belongs to this agent's workspace
  const { data: memory } = await admin
    .from('agent_memories')
    .select('workspace_id')
    .eq('id', memoryId)
    .single()

  if (!memory) {
    return NextResponse.json(
      { data: null, error: 'Memory not found' },
      { status: 404 }
    )
  }

  if (memory.workspace_id !== agentAuth.agentKey.workspace_id) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { error } = await admin
    .from('agent_memories')
    .delete()
    .eq('id', memoryId)

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: null, error: null })
}
