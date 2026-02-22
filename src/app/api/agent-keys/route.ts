import { randomBytes, createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('agent_keys')
    .select(
      'id, workspace_id, name, key_prefix, role, permissions, created_by, is_active, last_used_at, webhook_url, created_at, updated_at'
    )
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

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

  if (!body.workspace_id || !body.name) {
    return NextResponse.json(
      { data: null, error: 'workspace_id and name are required' },
      { status: 400 }
    )
  }

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    body.workspace_id
  )
  if (!authorized || (role !== 'owner' && role !== 'admin')) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  // Generate API key: dlg_ + 32 random hex chars
  const rawKey = randomBytes(32).toString('hex')
  const plaintextKey = `dlg_${rawKey}`
  const keyPrefix = `dlg_${rawKey.slice(0, 8)}`
  const keyHash = createHash('sha256').update(plaintextKey).digest('hex')

  // Generate webhook signing secret
  const webhookSecret = randomBytes(32).toString('hex')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('agent_keys')
    .insert({
      workspace_id: body.workspace_id,
      name: body.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      role: body.role ?? 'reader',
      permissions: body.permissions ?? {},
      created_by: user.id,
      webhook_url: body.webhook_url ?? null,
      webhook_secret: webhookSecret,
    })
    .select(
      'id, workspace_id, name, key_prefix, role, permissions, created_by, is_active, webhook_url, created_at, updated_at'
    )
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  // Return plaintext key ONCE — never retrievable again
  return NextResponse.json(
    {
      data: { ...data, key: plaintextKey, webhook_secret: webhookSecret },
      error: null,
    },
    { status: 201 }
  )
}
