import { NextResponse } from 'next/server'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'
import { shouldCreateBranchProposal } from '@/lib/agents/document-update-mode'
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

function buildAgentBranchName(agentName: string) {
  const safeName = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `agent-${safeName}-${new Date().toISOString().slice(0, 10)}`
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
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'documents.update',
    limit: 120,
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

  const { client, workspaceId } = auth
  const authorId = getAuthorId(auth)
  const authorType = auth.type
  const applyDirectly = body.apply_directly === true

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_edited_by: auth.type === 'agent' ? auth.agentKey.created_by : authorId,
  }

  if (body.title !== undefined) updateData.title = body.title
  if (body.content !== undefined) updateData.content = body.content
  if (body.folder_id !== undefined) updateData.folder_id = body.folder_id
  if (body.position !== undefined) updateData.position = body.position

  if (auth.type === 'agent' && shouldCreateBranchProposal(auth.type, applyDirectly)) {
    const branchName = buildAgentBranchName(auth.agentKey.name)
    const { data: rpcData, error: rpcError } = await client.rpc(
      'create_document_branch_atomic',
      {
        p_source_document_id: documentId,
        p_workspace_id: workspaceId,
        p_branch_name: branchName,
        p_created_by: authorId,
        p_created_by_type: 'agent',
        p_branch_doc_created_by: auth.agentKey.created_by,
        p_branch_doc_last_edited_by: auth.agentKey.created_by,
        p_title: body.title ?? null,
        p_content: body.content ?? null,
        p_folder_id: body.folder_id ?? null,
        p_position: body.position ?? null,
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

    const [{ data: branch, error: branchError }, { data: updatedBranchDoc, error: branchDocError }] =
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

    if (branchError || !branch || branchDocError || !updatedBranchDoc) {
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
      branch_document_id: updatedBranchDoc.id,
      created_by: authorId,
      created_by_type: authorType,
      proposal_mode: 'agent_default',
      fields_changed: Object.keys(body).filter((k) => k !== 'apply_directly'),
    })

    return NextResponse.json(
      {
        data: {
          mode: 'branch_proposal',
          branch,
          document: updatedBranchDoc,
        },
        error: null,
      },
      { status: 202 }
    )
  }

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
    fields_changed: Object.keys(body).filter((k) => k !== 'apply_directly'),
  })

  return NextResponse.json({ data: { mode: 'direct_update', document: data }, error: null })
}

export async function DELETE(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'documents.delete',
    limit: 30,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

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
