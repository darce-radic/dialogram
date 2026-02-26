import { NextResponse } from 'next/server'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'
import {
  parseCommunicationContract,
} from '@/lib/agents/communication-contract'
import {
  authenticateDocumentRoute,
  isAuthError,
  getAuthorId,
  parseJsonBody,
  isParseError,
} from '@/lib/supabase/route-auth'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

interface MentionTarget {
  id: string
  type: 'user' | 'agent'
}

function normalizeMentions(raw: unknown): MentionTarget[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return { id: entry, type: 'user' as const }
      }

      if (
        entry &&
        typeof entry === 'object' &&
        'id' in entry &&
        'type' in entry &&
        typeof entry.id === 'string' &&
        (entry.type === 'user' || entry.type === 'agent')
      ) {
        return { id: entry.id, type: entry.type }
      }

      return null
    })
    .filter((entry): entry is MentionTarget => entry !== null)
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
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'threads.create',
    limit: 180,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

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
  const content = body.content as string
  let commentMetadata: Record<string, unknown> = {}

  if (auth.type === 'agent') {
    const parsedContract = parseCommunicationContract(body.communication)
    if (!parsedContract.ok) {
      return NextResponse.json(
        { data: null, error: parsedContract.error },
        { status: 400 }
      )
    }
    commentMetadata = {
      communication: parsedContract.data,
    }
  }

  const { data: rpcData, error: rpcError } = await client.rpc(
    'create_thread_with_comment',
    {
      p_document_id: documentId,
      p_created_by: authorId,
      p_comment_body: content,
      p_thread_type: body.thread_type ?? defaultThreadType,
      p_inline_ref: body.inline_ref ?? null,
      p_comment_metadata: commentMetadata,
      p_thread_id: body.id ?? null,
      p_comment_id: body.comment_id ?? null,
    }
  )

  if (rpcError) {
    return NextResponse.json(
      { data: null, error: rpcError.message },
      { status: 500 }
    )
  }

  const firstRow = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
    | { thread_id: string; comment_id: string }
    | null

  if (!firstRow?.thread_id || !firstRow?.comment_id) {
    return NextResponse.json(
      { data: null, error: 'Failed to create thread comment payload' },
      { status: 500 }
    )
  }

  const [{ data: thread, error: threadError }, { data: comment, error: commentError }] =
    await Promise.all([
      client
        .from('comment_threads')
        .select('*')
        .eq('id', firstRow.thread_id)
        .single(),
      client
        .from('comments')
        .select('*')
        .eq('id', firstRow.comment_id)
        .single(),
    ])

  if (threadError || !thread || commentError || !comment) {
    return NextResponse.json(
      {
        data: null,
        error:
          threadError?.message ??
          commentError?.message ??
          'Failed to load created thread or comment',
      },
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
  const mentions = normalizeMentions(body.mentions)
  if (mentions.length > 0) {
    for (const mention of mentions) {
      dispatchWebhooks(workspaceId, 'mention.created', {
        thread_id: thread.id,
        document_id: documentId,
        mentioned_user_id: mention.type === 'user' ? mention.id : null, // backward compatibility
        mentioned_target_id: mention.id,
        mentioned_target_type: mention.type,
        author_id: authorId,
      })
    }
  }

  return NextResponse.json(
    { data: { ...thread, comments: [comment] }, error: null },
    { status: 201 }
  )
}
