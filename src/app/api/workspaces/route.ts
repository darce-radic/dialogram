import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json(
      { data: null, error: 'name is required' },
      { status: 400 }
    )
  }

  const name = (body.name as string).trim()
  if (name.length === 0 || name.length > 100) {
    return NextResponse.json(
      { data: null, error: 'name must be 1-100 characters' },
      { status: 400 }
    )
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Create workspace and add owner in a single transaction-like operation
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name, slug, owner_id: user.id })
    .select()
    .single()

  if (wsError) {
    return NextResponse.json(
      { data: null, error: wsError.message },
      { status: 500 }
    )
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    // Clean up the orphaned workspace
    await supabase.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json(
      { data: null, error: memberError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: workspace, error: null }, { status: 201 })
}
