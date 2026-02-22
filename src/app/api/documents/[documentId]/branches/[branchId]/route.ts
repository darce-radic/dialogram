import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'

interface RouteContext {
  params: Promise<{ documentId: string; branchId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { documentId, branchId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('workspace_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!doc) {
    return NextResponse.json(
      { data: null, error: 'Document not found' },
      { status: 404 }
    )
  }

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    doc.workspace_id
  )
  if (!authorized) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { data: branch, error: branchError } = await supabase
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
  const { data: sourceDoc } = await supabase
    .from('documents')
    .select('id, title, content')
    .eq('id', documentId)
    .single()

  const { data: branchDoc } = await supabase
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('workspace_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!doc) {
    return NextResponse.json(
      { data: null, error: 'Document not found' },
      { status: 404 }
    )
  }

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    doc.workspace_id
  )
  if (!authorized || (role !== 'owner' && role !== 'admin')) {
    return NextResponse.json(
      { data: null, error: 'Forbidden: owner or admin required' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.status || !['merged', 'rejected'].includes(body.status as string)) {
    return NextResponse.json(
      { data: null, error: "status must be 'merged' or 'rejected'" },
      { status: 400 }
    )
  }

  // Merge: use atomic RPC to prevent race conditions
  if (body.status === 'merged') {
    const admin = createAdminClient()
    const { error: mergeError } = await admin.rpc('merge_document_branch', {
      p_branch_id: branchId,
      p_source_document_id: documentId,
      p_merged_by: user.id,
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
    const { data: updatedBranch } = await supabase
      .from('document_branches')
      .select('*')
      .eq('id', branchId)
      .single()

    dispatchWebhooks(doc.workspace_id, 'branch.merged', {
      branch_id: branchId,
      source_document_id: documentId,
      branch_document_id: updatedBranch?.branch_document_id,
      status: 'merged',
      updated_by: user.id,
    })

    return NextResponse.json({ data: updatedBranch, error: null })
  }

  // Reject: simple status update (no content copy needed)
  const { data: branch } = await supabase
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

  const { data: updatedBranch, error } = await supabase
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

  dispatchWebhooks(doc.workspace_id, 'branch.rejected', {
    branch_id: branchId,
    source_document_id: documentId,
    branch_document_id: branch.branch_document_id,
    status: 'rejected',
    updated_by: user.id,
  })

  return NextResponse.json({ data: updatedBranch, error: null })
}
