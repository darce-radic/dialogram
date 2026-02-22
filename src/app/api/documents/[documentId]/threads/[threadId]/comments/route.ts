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
  params: Promise<{ documentId: string; threadId: string }>
}

export async function POST(request: Request, context: RouteContext) {
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

  const { data, error } = await client
    .from('comments')
    .insert({
      id: body.id ?? undefined,
      thread_id: threadId,
      document_id: documentId,
      author_id: authorId,
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

  dispatchWebhooks(workspaceId, 'comment.created', {
    comment_id: data.id,
    thread_id: threadId,
    document_id: documentId,
    author_id: authorId,
    author_type: authorType,
  })

  return NextResponse.json({ data, error: null }, { status: 201 })
}
