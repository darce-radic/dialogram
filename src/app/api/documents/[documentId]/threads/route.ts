import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { documentId } = await context.params
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

    // Fetch threads with admin client
    const { data: threads, error: threadsError } = await admin
      .from('comment_threads')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (threadsError) {
      return NextResponse.json(
        { data: null, error: threadsError.message },
        { status: 500 }
      )
    }

    const threadIds = (threads ?? []).map((t: { id: string }) => t.id)
    let comments: Record<string, unknown>[] = []

    if (threadIds.length > 0) {
      const { data: commentsData } = await admin
        .from('comments')
        .select('*')
        .in('thread_id', threadIds)
        .order('created_at')

      comments = commentsData ?? []
    }

    const commentsByThread: Record<string, Record<string, unknown>[]> = {}
    for (const comment of comments) {
      const tid = comment.thread_id as string
      if (!commentsByThread[tid]) commentsByThread[tid] = []
      commentsByThread[tid].push(comment)
    }

    const threadsWithComments = (threads ?? []).map(
      (thread: Record<string, unknown>) => ({
        ...thread,
        comments: commentsByThread[thread.id as string] ?? [],
      })
    )

    return NextResponse.json({ data: threadsWithComments, error: null })
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

  // Fetch threads with their comments
  const { data: threads, error: threadsError } = await supabase
    .from('comment_threads')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  if (threadsError) {
    return NextResponse.json(
      { data: null, error: threadsError.message },
      { status: 500 }
    )
  }

  const threadIds = (threads ?? []).map((t: { id: string }) => t.id)
  let comments: Record<string, unknown>[] = []

  if (threadIds.length > 0) {
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .in('thread_id', threadIds)
      .order('created_at')

    comments = commentsData ?? []
  }

  const commentsByThread: Record<string, Record<string, unknown>[]> = {}
  for (const comment of comments) {
    const tid = comment.thread_id as string
    if (!commentsByThread[tid]) commentsByThread[tid] = []
    commentsByThread[tid].push(comment)
  }

  const threadsWithComments = (threads ?? []).map(
    (thread: Record<string, unknown>) => ({
      ...thread,
      comments: commentsByThread[thread.id as string] ?? [],
    })
  )

  return NextResponse.json({ data: threadsWithComments, error: null })
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params
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

    const { data: thread, error: threadError } = await admin
      .from('comment_threads')
      .insert({
        id: body.id ?? undefined,
        document_id: documentId,
        thread_type: body.thread_type ?? 'document',
        inline_ref: body.inline_ref ?? null,
        created_by: agentAuth.agentKey.id,
      })
      .select()
      .single()

    if (threadError) {
      return NextResponse.json(
        { data: null, error: threadError.message },
        { status: 500 }
      )
    }

    const { data: comment, error: commentError } = await admin
      .from('comments')
      .insert({
        id: body.comment_id ?? undefined,
        thread_id: thread.id,
        document_id: documentId,
        author_id: agentAuth.agentKey.id,
        body: body.content,
      })
      .select()
      .single()

    if (commentError) {
      return NextResponse.json(
        { data: null, error: commentError.message },
        { status: 500 }
      )
    }

    dispatchWebhooks(doc.workspace_id, 'thread.created', {
      thread_id: thread.id,
      comment_id: comment.id,
      document_id: documentId,
      author_id: agentAuth.agentKey.id,
      author_type: 'agent',
    })

    return NextResponse.json(
      { data: { ...thread, comments: [comment] }, error: null },
      { status: 201 }
    )
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

  const { data: thread, error: threadError } = await supabase
    .from('comment_threads')
    .insert({
      id: body.id ?? undefined,
      document_id: documentId,
      thread_type: body.thread_type ?? 'inline',
      inline_ref: body.inline_ref ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (threadError) {
    return NextResponse.json(
      { data: null, error: threadError.message },
      { status: 500 }
    )
  }

  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .insert({
      id: body.comment_id ?? undefined,
      thread_id: thread.id,
      document_id: documentId,
      author_id: user.id,
      body: body.content,
    })
    .select()
    .single()

  if (commentError) {
    return NextResponse.json(
      { data: null, error: commentError.message },
      { status: 500 }
    )
  }

  dispatchWebhooks(doc.workspace_id, 'thread.created', {
    thread_id: thread.id,
    comment_id: comment.id,
    document_id: documentId,
    author_id: user.id,
    author_type: 'user',
  })

  // Dispatch mention.created webhooks if mentions present
  if (body.mentions && Array.isArray(body.mentions)) {
    for (const mentionedUserId of body.mentions) {
      dispatchWebhooks(doc.workspace_id, 'mention.created', {
        thread_id: thread.id,
        document_id: documentId,
        mentioned_user_id: mentionedUserId,
        author_id: user.id,
      })
    }
  }

  return NextResponse.json(
    { data: { ...thread, comments: [comment] }, error: null },
    { status: 201 }
  )
}
