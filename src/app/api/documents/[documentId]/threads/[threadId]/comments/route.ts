import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'

interface RouteContext {
  params: Promise<{ documentId: string; threadId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId, threadId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Try agent auth
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
      .from('comments')
      .insert({
        id: body.id ?? undefined,
        thread_id: threadId,
        document_id: documentId,
        author_id: agentAuth.agentKey.id,
        body: body.content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    dispatchWebhooks(doc.workspace_id, 'comment.created', {
      comment_id: data.id,
      thread_id: threadId,
      document_id: documentId,
      author_id: agentAuth.agentKey.id,
      author_type: 'agent',
    })

    return NextResponse.json({ data, error: null }, { status: 201 })
  }

  // User auth path
  const { data: doc } = await supabase
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

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    doc.workspace_id
  )
  if (!authorized) {
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

  const { data, error } = await supabase
    .from('comments')
    .insert({
      id: body.id ?? undefined,
      thread_id: threadId,
      document_id: documentId,
      author_id: user.id,
      body: body.content,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  dispatchWebhooks(doc.workspace_id, 'comment.created', {
    comment_id: data.id,
    thread_id: threadId,
    document_id: documentId,
    author_id: user.id,
    author_type: 'user',
  })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
