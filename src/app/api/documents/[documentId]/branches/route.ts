import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { authenticateAgent } from '@/lib/supabase/agent-auth'
import { dispatchWebhooks } from '@/lib/agents/dispatch-webhooks'

interface RouteContext {
  params: Promise<{ documentId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { documentId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Try agent auth
    const agentAuth = await authenticateAgent(
      request.headers.get('authorization')
    )
    if (!agentAuth.authenticated || !agentAuth.agentKey) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admin = createAdminClient()
    const { data: doc } = await admin
      .from('documents')
      .select('workspace_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (!doc || doc.workspace_id !== agentAuth.agentKey.workspace_id) {
      return NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { data: branches, error } = await admin
      .from('document_branches')
      .select('*')
      .eq('source_document_id', documentId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: branches ?? [], error: null })
  }

  // User auth path
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

  const { data: branches, error } = await supabase
    .from('document_branches')
    .select('*')
    .eq('source_document_id', documentId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: branches ?? [], error: null })
}

export async function POST(request: Request, context: RouteContext) {
  const { documentId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Try agent auth — editor role required
    const agentAuth = await authenticateAgent(
      request.headers.get('authorization')
    )
    if (!agentAuth.authenticated || !agentAuth.agentKey) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (agentAuth.agentKey.role !== 'editor') {
      return NextResponse.json(
        { data: null, error: 'Forbidden: editor role required' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()
    const { data: sourceDoc } = await admin
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

    if (sourceDoc.workspace_id !== agentAuth.agentKey.workspace_id) {
      return NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    if (!body.branch_name) {
      return NextResponse.json(
        { data: null, error: 'branch_name is required' },
        { status: 400 }
      )
    }

    // Create branch document (copy of source)
    const { data: branchDoc, error: branchDocError } = await admin
      .from('documents')
      .insert({
        workspace_id: sourceDoc.workspace_id,
        folder_id: sourceDoc.folder_id,
        title: `${sourceDoc.title} — ${body.branch_name}`,
        content: sourceDoc.content,
        created_by: agentAuth.agentKey.created_by,
        last_edited_by: agentAuth.agentKey.id,
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
    const { data: branch, error: branchError } = await admin
      .from('document_branches')
      .insert({
        source_document_id: documentId,
        branch_document_id: branchDoc.id,
        branch_name: body.branch_name,
        created_by: agentAuth.agentKey.id,
        created_by_type: 'agent',
      })
      .select()
      .single()

    if (branchError) {
      return NextResponse.json(
        { data: null, error: branchError.message },
        { status: 500 }
      )
    }

    dispatchWebhooks(sourceDoc.workspace_id, 'branch.created', {
      branch_id: branch.id,
      source_document_id: documentId,
      branch_document_id: branchDoc.id,
      created_by: agentAuth.agentKey.id,
      created_by_type: 'agent',
    })

    return NextResponse.json(
      { data: { branch, document: branchDoc }, error: null },
      { status: 201 }
    )
  }

  // User auth path
  const { data: sourceDoc } = await supabase
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

  const workspaceId = sourceDoc.workspace_id

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    workspaceId
  )
  if (!authorized) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const body = await request.json()
  if (!body.branch_name) {
    return NextResponse.json(
      { data: null, error: 'branch_name is required' },
      { status: 400 }
    )
  }

  // Create branch document (copy of source)
  const { data: branchDoc, error: branchDocError } = await supabase
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      folder_id: sourceDoc.folder_id,
      title: `${sourceDoc.title} — ${body.branch_name}`,
      content: sourceDoc.content,
      created_by: user.id,
      last_edited_by: user.id,
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
  const { data: branch, error: branchError } = await supabase
    .from('document_branches')
    .insert({
      source_document_id: documentId,
      branch_document_id: branchDoc.id,
      branch_name: body.branch_name,
      created_by: user.id,
      created_by_type: 'user',
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
    created_by: user.id,
    created_by_type: 'user',
  })

  return NextResponse.json(
    { data: { branch, document: branchDoc }, error: null },
    { status: 201 }
  )
}
