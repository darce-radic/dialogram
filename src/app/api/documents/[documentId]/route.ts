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

  // Try agent auth if no user session
  if (!user) {
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
    const { data, error } = await admin
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

    if (data.workspace_id !== agentAuth.agentKey.workspace_id) {
      return NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({ data, error: null })
  }

  const { data, error } = await supabase
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

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    data.workspace_id
  )
  if (!authorized) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let workspaceId: string
  let editorId: string

  // Try agent auth if no user session
  if (!user) {
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
    const { data: doc } = await admin
      .from('documents')
      .select('workspace_id')
      .eq('id', documentId)
      .is('deleted_at', null)
      .single()

    if (!doc) {
      return NextResponse.json(
        { data: null, error: 'Not found' },
        { status: 404 }
      )
    }

    if (doc.workspace_id !== agentAuth.agentKey.workspace_id) {
      return NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      )
    }

    workspaceId = doc.workspace_id
    editorId = agentAuth.agentKey.id

    const body = await request.json()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_edited_by: agentAuth.agentKey.created_by,
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.folder_id !== undefined) updateData.folder_id = body.folder_id
    if (body.position !== undefined) updateData.position = body.position

    const { data, error } = await admin
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

    // Dispatch doc.updated webhook
    dispatchWebhooks(workspaceId, 'doc.updated', {
      document_id: documentId,
      updated_by: editorId,
      updated_by_type: 'agent',
      fields_changed: Object.keys(body),
    })

    return NextResponse.json({ data, error: null })
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
      { data: null, error: 'Not found' },
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

  workspaceId = doc.workspace_id

  const body = await request.json()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_edited_by: user.id,
  }

  if (body.title !== undefined) updateData.title = body.title
  if (body.content !== undefined) updateData.content = body.content
  if (body.folder_id !== undefined) updateData.folder_id = body.folder_id
  if (body.position !== undefined) updateData.position = body.position

  const { data, error } = await supabase
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

  // Dispatch doc.updated webhook
  dispatchWebhooks(workspaceId, 'doc.updated', {
    document_id: documentId,
    updated_by: user.id,
    updated_by_type: 'user',
    fields_changed: Object.keys(body),
  })

  return NextResponse.json({ data, error: null })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { documentId } = await context.params
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
      { data: null, error: 'Not found' },
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
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
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
