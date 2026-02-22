import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

interface RouteContext {
  params: Promise<{ keyId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { keyId } = await context.params
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

  const admin = createAdminClient()

  // Fetch the agent key to get workspace_id
  const { data: agentKey } = await admin
    .from('agent_keys')
    .select('workspace_id')
    .eq('id', keyId)
    .single()

  if (!agentKey) {
    return NextResponse.json(
      { data: null, error: 'Agent key not found' },
      { status: 404 }
    )
  }

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    agentKey.workspace_id
  )
  if (!authorized || (role !== 'owner' && role !== 'admin')) {
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
  if (body.role !== undefined) updateData.role = body.role
  if (body.is_active !== undefined) updateData.is_active = body.is_active
  if (body.permissions !== undefined) updateData.permissions = body.permissions
  if (body.webhook_url !== undefined) updateData.webhook_url = body.webhook_url

  const { data, error } = await admin
    .from('agent_keys')
    .update(updateData)
    .eq('id', keyId)
    .select(
      'id, workspace_id, name, key_prefix, role, permissions, created_by, is_active, last_used_at, webhook_url, created_at, updated_at'
    )
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
  const { keyId } = await context.params
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

  const admin = createAdminClient()

  const { data: agentKey } = await admin
    .from('agent_keys')
    .select('workspace_id')
    .eq('id', keyId)
    .single()

  if (!agentKey) {
    return NextResponse.json(
      { data: null, error: 'Agent key not found' },
      { status: 404 }
    )
  }

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    agentKey.workspace_id
  )
  if (!authorized || (role !== 'owner' && role !== 'admin')) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const { error } = await admin
    .from('agent_keys')
    .delete()
    .eq('id', keyId)

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: null, error: null })
}
