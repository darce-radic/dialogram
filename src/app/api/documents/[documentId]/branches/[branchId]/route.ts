import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'
import {
  authenticateDocumentRoute,
  isAuthError,
  parseJsonBody,
  isParseError,
} from '@/lib/supabase/route-auth'

interface RouteContext {
  params: Promise<{ documentId: string; branchId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { documentId, branchId } = await context.params

  const auth = await authenticateDocumentRoute(request, documentId)
  if (isAuthError(auth)) return auth.response

  const { client } = auth

  const { data: branch, error: branchError } = await client
    .from('document_branches')
    .select('*')
    .eq('id', branchId)
    .eq('source_document_id', documentId)
    .single()

  if (branchError || !branch) {
    return NextResponse.json(
      { data: null, error: 'Branch not found' },
      { status: 404 }
    )
  }

  // Fetch both documents for diff
  const { data: sourceDoc } = await client
    .from('documents')
    .select('id, title, content')
    .eq('id', documentId)
    .single()

  const { data: branchDoc } = await client
    .from('documents')
    .select('id, title, content')
    .eq('id', branch.branch_document_id)
    .single()

  return NextResponse.json({
    data: {
      branch,
      sourceDocument: sourceDoc,
      branchDocument: branchDoc,
    },
    error: null,
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId, branchId } = await context.params

  // PATCH requires user with owner/admin role
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

  const bodyResult = await parseJsonBody(request)
  if (isParseError(bodyResult)) return bodyResult
  const body = bodyResult

  if (!body.status || !['merged', 'rejected'].includes(body.status as string)) {
    return NextResponse.json(
      { data: null, error: "status must be 'merged' or 'rejected'" },
      { status: 400 }
    )
  }

  const { workspaceId } = auth

  // Merge: use atomic RPC to prevent race conditions
  if (body.status === 'merged') {
    const admin = createAdminClient()
    const { error: mergeError } = await admin.rpc('merge_document_branch', {
      p_branch_id: branchId,
      p_source_document_id: documentId,
      p_merged_by: auth.userId,
    })

    if (mergeError) {
      const status = mergeError.message.includes('not found')
        ? 404
        : mergeError.message.includes('not open')
          ? 400
          : 500
      return NextResponse.json(
        { data: null, error: mergeError.message },
        { status }
      )
    }

    // Fetch the updated branch for the response
    const { data: updatedBranch } = await auth.client
      .from('document_branches')
      .select('*')
      .eq('id', branchId)
      .single()

    dispatchWebhooks(workspaceId, 'branch.merged', {
      branch_id: branchId,
      source_document_id: documentId,
      branch_document_id: updatedBranch?.branch_document_id,
      status: 'merged',
      updated_by: auth.userId,
    })

    return NextResponse.json({ data: updatedBranch, error: null })
  }

  // Reject: simple status update
  const { data: branch } = await auth.client
    .from('document_branches')
    .select('*')
    .eq('id', branchId)
    .eq('source_document_id', documentId)
    .single()

  if (!branch) {
    return NextResponse.json(
      { data: null, error: 'Branch not found' },
      { status: 404 }
    )
  }

  if (branch.status !== 'open') {
    return NextResponse.json(
      { data: null, error: 'Branch is not open' },
      { status: 400 }
    )
  }

  const { data: updatedBranch, error } = await auth.client
    .from('document_branches')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', branchId)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  dispatchWebhooks(workspaceId, 'branch.rejected', {
    branch_id: branchId,
    source_document_id: documentId,
    branch_document_id: branch.branch_document_id,
    status: 'rejected',
    updated_by: auth.userId,
  })

  return NextResponse.json({ data: updatedBranch, error: null })
}
