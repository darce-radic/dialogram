import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

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

export async function DELETE(_request: Request, context: RouteContext) {
  const { documentId, threadId } = await context.params
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
