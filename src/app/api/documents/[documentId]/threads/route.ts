import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Fetch document to get workspace_id for membership check
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

  // Fetch comments for all threads
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

  // Group comments by thread
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
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

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

  // Create thread
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

  // Create initial comment
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

  return NextResponse.json(
    { data: { ...thread, comments: [comment] }, error: null },
    { status: 201 }
  )
}
