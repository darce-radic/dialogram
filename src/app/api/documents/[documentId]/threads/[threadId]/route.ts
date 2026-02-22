import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { authenticateAgent } from '@/lib/supabase/agent-auth'

interface RouteContext {
  params: Promise<{ documentId: string; threadId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId, threadId } = await context.params
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

    if (
      agentAuth.agentKey.role !== 'commenter' &&
      agentAuth.agentKey.role !== 'editor'
    ) {
      return NextResponse.json(
        { data: null, error: 'Forbidden: commenter or editor role required' },
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
        { data: null, error: 'Document not found' },
        { status: 404 }
      )
    }

    if (doc.workspace_id !== agentAuth.agentKey.workspace_id) {
      return NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.resolved !== undefined) {
      updateData.resolved = body.resolved
      if (body.resolved) {
        updateData.resolved_by = agentAuth.agentKey.id
        updateData.resolved_at = new Date().toISOString()
      } else {
        updateData.resolved_by = null
        updateData.resolved_at = null
      }
    }

    const { data, error } = await admin
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

  const body = await request.json()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.resolved !== undefined) {
    updateData.resolved = body.resolved
    if (body.resolved) {
      updateData.resolved_by = user.id
      updateData.resolved_at = new Date().toISOString()
    } else {
      updateData.resolved_by = null
      updateData.resolved_at = null
    }
  }

  const { data, error } = await supabase
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
  const { documentId, threadId } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Try agent auth — only editor role can delete
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
        { data: null, error: 'Document not found' },
        { status: 404 }
      )
    }

    if (doc.workspace_id !== agentAuth.agentKey.workspace_id) {
      return NextResponse.json(
        { data: null, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error } = await admin
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

  // Comments cascade delete via FK
  const { error } = await supabase
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
