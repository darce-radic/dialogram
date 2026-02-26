import { NextResponse } from 'next/server'
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

export async function PATCH(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'threads.update',
    limit: 120,
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

  const { client } = auth
  const authorId = getAuthorId(auth)

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.resolved !== undefined) {
    updateData.resolved = body.resolved
    if (body.resolved) {
      updateData.resolved_by = authorId
      updateData.resolved_at = new Date().toISOString()
    } else {
      updateData.resolved_by = null
      updateData.resolved_at = null
    }
  }

  const { data, error } = await client
    .from('comment_threads')
    .update(updateData)
    .eq('id', threadId)
    .eq('document_id', documentId)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'threads.delete',
    limit: 60,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const { documentId, threadId } = await context.params

  const auth = await authenticateDocumentRoute(request, documentId, {
    requiredAgentRoles: ['editor'],
  })
  if (isAuthError(auth)) return auth.response

  const { client } = auth

  // Comments cascade delete via FK
  const { error } = await client
    .from('comment_threads')
    .delete()
    .eq('id', threadId)
    .eq('document_id', documentId)

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: null, error: null })
}
