import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import {
  parseCommunicationContract,
  parseLifecycleState,
} from '@/lib/agents/communication-contract'
import { publishScratchpadEvent } from '@/lib/queue/redis-pubsub'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'scratchpad.create',
    limit: 240,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const { documentId } = await context.params

  // Agent auth only
  const agentAuth = await authenticateAgent(
    request.headers.get('authorization'),
    request
  )
  if (agentAuth.rateLimited) {
    return NextResponse.json(
      { data: null, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(agentAuth.retryAfterSeconds ?? 60) },
      }
    )
  }
  if (!agentAuth.authenticated || !agentAuth.agentKey) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (
    agentAuth.agentKey.role !== 'commenter' &&
    agentAuth.agentKey.role !== 'editor'
  ) {
    return NextResponse.json(
      { data: null, error: 'Forbidden: commenter or editor role required' },
      { status: 403 }
    )
  }

  const admin = createAdminClient()

  // Verify document exists and belongs to agent's workspace
  const { data: doc } = await admin
    .from('documents')
    .select('workspace_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!doc) {
    return NextResponse.json(
      { data: null, error: 'Document not found' },
      { status: 404 }
    )
  }

  if (doc.workspace_id !== agentAuth.agentKey.workspace_id) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json(
      { data: null, error: 'content is required' },
      { status: 400 }
    )
  }

  const validEventTypes = ['thinking', 'tool_use', 'progress', 'error']
  const eventType =
    typeof body.event_type === 'string' &&
    validEventTypes.includes(body.event_type)
      ? body.event_type
      : 'thinking'

  const metadata =
    body.metadata && typeof body.metadata === 'object' ? body.metadata : {}

  const parsedLifecycle = parseLifecycleState(
    (metadata as Record<string, unknown>).lifecycle_state
  )
  if (!parsedLifecycle.ok) {
    return NextResponse.json(
      { data: null, error: parsedLifecycle.error },
      { status: 400 }
    )
  }

  const parsedContract = parseCommunicationContract(body.communication)
  if (!parsedContract.ok) {
    return NextResponse.json(
      { data: null, error: parsedContract.error },
      { status: 400 }
    )
  }

  const { data, error } = await admin
    .from('scratchpad_events')
    .insert({
      document_id: documentId,
      agent_key_id: agentAuth.agentKey.id,
      event_type: eventType,
      content: body.content,
      metadata: {
        ...(metadata as Record<string, unknown>),
        lifecycle_state: parsedLifecycle.data,
        communication: parsedContract.data,
      },
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  // Publish to Redis for SSE subscribers (fire-and-forget)
  publishScratchpadEvent(documentId, data)

  return NextResponse.json({ data, error: null }, { status: 201 })
}
