import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json(
      { data: null, error: 'workspaceId is required' },
      { status: 400 }
    )
  }

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

  let query = supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('position')

  const folderId = searchParams.get('folderId')
  if (folderId) {
    query = query.eq('folder_id', folderId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
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

  const body = await request.json()

  if (!body.workspace_id) {
    return NextResponse.json(
      { data: null, error: 'workspace_id is required' },
      { status: 400 }
    )
  }

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    body.workspace_id
  )
  if (!authorized) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      workspace_id: body.workspace_id,
      title: body.title ?? 'Untitled',
      folder_id: body.folder_id ?? null,
      content: body.content ?? null,
      created_by: user.id,
      position: body.position ?? 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
