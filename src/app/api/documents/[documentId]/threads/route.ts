import { NextResponse } from 'next/server'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'
import {
  authenticateDocumentRoute,
  isAuthError,
  getAuthorId,
  parseJsonBody,
  isParseError,
} from '@/lib/supabase/route-auth'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { documentId } = await context.params

  const auth = await authenticateDocumentRoute(request, documentId)
  if (isAuthError(auth)) return auth.response

  const { client } = auth

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10) || 100), 500)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)

  const { data: threads, error: threadsError, count } = await client
    .from('comment_threads')
    .select('*', { count: 'exact' })
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (threadsError) {
    return NextResponse.json(
      { data: null, error: threadsError.message },
      { status: 500 }
    )
  }

  const threadIds = (threads ?? []).map((t: { id: string }) => t.id)
  let comments: Record<string, unknown>[] = []

  if (threadIds.length > 0) {
    const { data: commentsData } = await client
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

  return NextResponse.json({ data: threadsWithComments, pagination: { limit, offset, total: count ?? 0 }, error: null })
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params

  const auth = await authenticateDocumentRoute(request, documentId, {
    requiredAgentRoles: ['commenter', 'editor'],
  })
  if (isAuthError(auth)) return auth.response

  const bodyResult = await parseJsonBody(request)
  if (isParseError(bodyResult)) return bodyResult
  const body = bodyResult

  if (!body.content) {
    return NextResponse.json(
      { data: null, error: 'content is required' },
      { status: 400 }
    )
  }

  const { client, workspaceId } = auth
  const authorId = getAuthorId(auth)
  const authorType = auth.type
  const defaultThreadType = auth.type === 'agent' ? 'document' : 'inline'

  const { data: thread, error: threadError } = await client
    .from('comment_threads')
    .insert({
      id: body.id ?? undefined,
      document_id: documentId,
      thread_type: body.thread_type ?? defaultThreadType,
      inline_ref: body.inline_ref ?? null,
      created_by: authorId,
    })
    .select()
    .single()

  if (threadError) {
    return NextResponse.json(
      { data: null, error: threadError.message },
      { status: 500 }
    )
  }

  const { data: comment, error: commentError } = await client
    .from('comments')
    .insert({
      id: body.comment_id ?? undefined,
      thread_id: thread.id,
      document_id: documentId,
      author_id: authorId,
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

  dispatchWebhooks(workspaceId, 'thread.created', {
    thread_id: thread.id,
    comment_id: comment.id,
    document_id: documentId,
    author_id: authorId,
    author_type: authorType,
  })

  // Dispatch mention.created webhooks if mentions present
  if (body.mentions && Array.isArray(body.mentions)) {
    for (const mentionedUserId of body.mentions) {
      dispatchWebhooks(workspaceId, 'mention.created', {
        thread_id: thread.id,
        document_id: documentId,
        mentioned_user_id: mentionedUserId,
        author_id: authorId,
      })
    }
  }

  return NextResponse.json(
    { data: { ...thread, comments: [comment] }, error: null },
    { status: 201 }
  )
}
