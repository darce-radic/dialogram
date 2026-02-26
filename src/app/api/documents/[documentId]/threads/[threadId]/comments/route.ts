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
  params: Promise<{ documentId: string; threadId: string }>
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

export async function POST(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'comments.create',
    limit: 240,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const { documentId, threadId } = await context.params

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

  const { data: thread, error: threadError } = await client
    .from('comment_threads')
    .select('id')
    .eq('id', threadId)
    .eq('document_id', documentId)
    .single()

  if (threadError || !thread) {
    return NextResponse.json(
      { data: null, error: 'Thread not found for document' },
      { status: 404 }
    )
  }

  const { data, error } = await client
    .from('comments')
    .insert({
      id: body.id ?? undefined,
      thread_id: threadId,
      document_id: documentId,
      author_id: authorId,
      body: content,
      metadata: commentMetadata,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  dispatchWebhooks(workspaceId, 'comment.created', {
    comment_id: data.id,
    thread_id: threadId,
    document_id: documentId,
    author_id: authorId,
    author_type: authorType,
  })

  const mentions = normalizeMentions(body.mentions)
  if (mentions.length > 0) {
    for (const mention of mentions) {
      dispatchWebhooks(workspaceId, 'mention.created', {
        thread_id: threadId,
        document_id: documentId,
        comment_id: data.id,
        mentioned_user_id: mention.type === 'user' ? mention.id : null,
        mentioned_target_id: mention.id,
        mentioned_target_type: mention.type,
        author_id: authorId,
      })
    }
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
