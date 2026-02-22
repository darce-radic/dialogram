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

  const { data: branches, error, count } = await client
    .from('document_branches')
    .select('*', { count: 'exact' })
    .eq('source_document_id', documentId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: branches ?? [], pagination: { limit, offset, total: count ?? 0 }, error: null })
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params

  const auth = await authenticateDocumentRoute(request, documentId, {
    requiredAgentRoles: ['editor'],
  })
  if (isAuthError(auth)) return auth.response

  const bodyResult = await parseJsonBody(request)
  if (isParseError(bodyResult)) return bodyResult
  const body = bodyResult

  if (!body.branch_name || typeof body.branch_name !== 'string') {
    return NextResponse.json(
      { data: null, error: 'branch_name is required' },
      { status: 400 }
    )
  }

  const branchName = (body.branch_name as string).trim()
  if (branchName.length === 0 || branchName.length > 200) {
    return NextResponse.json(
      { data: null, error: 'branch_name must be 1-200 characters' },
      { status: 400 }
    )
  }

  const { client, workspaceId } = auth
  const authorId = getAuthorId(auth)
  const authorType = auth.type

  // Fetch source document
  const { data: sourceDoc } = await client
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!sourceDoc) {
    return NextResponse.json(
      { data: null, error: 'Document not found' },
      { status: 404 }
    )
  }

  // Create branch document (copy of source)
  const { data: branchDoc, error: branchDocError } = await client
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      folder_id: sourceDoc.folder_id,
      title: `${sourceDoc.title} — ${branchName}`,
      content: sourceDoc.content,
      created_by: auth.type === 'agent' ? auth.agentKey.created_by : authorId,
      last_edited_by: authorId,
    })
    .select()
    .single()

  if (branchDocError) {
    return NextResponse.json(
      { data: null, error: branchDocError.message },
      { status: 500 }
    )
  }

  // Create branch record
  const { data: branch, error: branchError } = await client
    .from('document_branches')
    .insert({
      source_document_id: documentId,
      branch_document_id: branchDoc.id,
      branch_name: branchName,
      created_by: authorId,
      created_by_type: authorType,
    })
    .select()
    .single()

  if (branchError) {
    return NextResponse.json(
      { data: null, error: branchError.message },
      { status: 500 }
    )
  }

  dispatchWebhooks(workspaceId, 'branch.created', {
    branch_id: branch.id,
    source_document_id: documentId,
    branch_document_id: branchDoc.id,
    created_by: authorId,
    created_by_type: authorType,
  })

  return NextResponse.json(
    { data: { branch, document: branchDoc }, error: null },
    { status: 201 }
  )
}
