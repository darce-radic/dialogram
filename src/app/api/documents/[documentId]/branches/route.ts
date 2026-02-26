import { NextResponse } from 'next/server'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'
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
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'branches.create',
    limit: 60,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

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

  const { data: rpcData, error: rpcError } = await client.rpc(
    'create_document_branch_atomic',
    {
      p_source_document_id: documentId,
      p_workspace_id: workspaceId,
      p_branch_name: branchName,
      p_created_by: authorId,
      p_created_by_type: authorType,
      p_branch_doc_created_by:
        auth.type === 'agent' ? auth.agentKey.created_by : authorId,
      p_branch_doc_last_edited_by: authorId,
    }
  )

  if (rpcError) {
    const isMissingDoc = rpcError.message.toLowerCase().includes('not found')
    return NextResponse.json(
      { data: null, error: isMissingDoc ? 'Document not found' : rpcError.message },
      { status: isMissingDoc ? 404 : 500 }
    )
  }

  const firstRow = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
    | { branch_id: string; branch_document_id: string }
    | null

  if (!firstRow?.branch_id || !firstRow?.branch_document_id) {
    return NextResponse.json(
      { data: null, error: 'Failed to create branch payload' },
      { status: 500 }
    )
  }

  const [{ data: branch, error: branchError }, { data: branchDoc, error: branchDocError }] =
    await Promise.all([
      client
        .from('document_branches')
        .select('*')
        .eq('id', firstRow.branch_id)
        .single(),
      client
        .from('documents')
        .select('*')
        .eq('id', firstRow.branch_document_id)
        .single(),
    ])

  if (branchError || !branch || branchDocError || !branchDoc) {
    return NextResponse.json(
      {
        data: null,
        error:
          branchError?.message ??
          branchDocError?.message ??
          'Failed to load created branch payload',
      },
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
