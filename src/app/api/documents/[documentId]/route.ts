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

  const { data, error } = await client
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: error.code === 'PGRST116' ? 404 : 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId } = await context.params

  const auth = await authenticateDocumentRoute(request, documentId, {
    requiredAgentRoles: ['editor'],
  })
  if (isAuthError(auth)) return auth.response

  const bodyResult = await parseJsonBody(request)
  if (isParseError(bodyResult)) return bodyResult
  const body = bodyResult

  const { client, workspaceId } = auth
  const authorId = getAuthorId(auth)
  const authorType = auth.type

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_edited_by: auth.type === 'agent' ? auth.agentKey.created_by : authorId,
  }

  if (body.title !== undefined) updateData.title = body.title
  if (body.content !== undefined) updateData.content = body.content
  if (body.folder_id !== undefined) updateData.folder_id = body.folder_id
  if (body.position !== undefined) updateData.position = body.position

  const { data, error } = await client
    .from('documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  dispatchWebhooks(workspaceId, 'doc.updated', {
    document_id: documentId,
    updated_by: authorId,
    updated_by_type: authorType,
    fields_changed: Object.keys(body),
  })

  return NextResponse.json({ data, error: null })
}

export async function DELETE(request: Request, context: RouteContext) {
  const { documentId } = await context.params

  // DELETE is user-only — no agent support
  const auth = await authenticateDocumentRoute(request, documentId)
  if (isAuthError(auth)) return auth.response

  if (auth.type !== 'user') {
    return NextResponse.json(
      { data: null, error: 'Forbidden: user access required' },
      { status: 403 }
    )
  }

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return NextResponse.json(
      { data: null, error: 'Forbidden: owner or admin required' },
      { status: 403 }
    )
  }

  const { data, error } = await auth.client
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId)
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
