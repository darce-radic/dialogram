import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import { publishScratchpadEvent } from '@/lib/queue/redis-pubsub'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params

  // Agent auth only
  const agentAuth = await authenticateAgent(
    request.headers.get('authorization')
  )
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

  const body = await request.json()

  if (!body.content) {
    return NextResponse.json(
      { data: null, error: 'content is required' },
      { status: 400 }
    )
  }

  const { data, error } = await admin
    .from('scratchpad_events')
    .insert({
      document_id: documentId,
      agent_key_id: agentAuth.agentKey.id,
      event_type: body.event_type ?? 'thinking',
      content: body.content,
      metadata: body.metadata ?? {},
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
