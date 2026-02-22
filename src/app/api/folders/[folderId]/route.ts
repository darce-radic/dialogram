import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

interface RouteContext {
  params: Promise<{ folderId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { folderId } = await context.params
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

  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', folderId)
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
  const { folderId } = await context.params
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

  // Fetch folder to verify workspace membership
  const { data: folder } = await supabase
    .from('folders')
    .select('workspace_id')
    .eq('id', folderId)
    .is('deleted_at', null)
    .single()

  if (!folder) {
    return NextResponse.json(
      { data: null, error: 'Not found' },
      { status: 404 }
    )
  }

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    folder.workspace_id
  )
  if (!authorized) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
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

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.name !== undefined) updateData.name = body.name
  if (body.parent_folder_id !== undefined)
    updateData.parent_folder_id = body.parent_folder_id
  if (body.position !== undefined) updateData.position = body.position

  const { data, error } = await supabase
    .from('folders')
    .update(updateData)
    .eq('id', folderId)
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
  const { folderId } = await context.params
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

  // Fetch folder to verify workspace membership + role
  const { data: folder } = await supabase
    .from('folders')
    .select('workspace_id')
    .eq('id', folderId)
    .is('deleted_at', null)
    .single()

  if (!folder) {
    return NextResponse.json(
      { data: null, error: 'Not found' },
      { status: 404 }
    )
  }

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    folder.workspace_id
  )
  if (!authorized || (role !== 'owner' && role !== 'admin')) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('folders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', folderId)
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
