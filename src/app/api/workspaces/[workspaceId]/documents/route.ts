import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { authenticateAgent } from '@/lib/supabase/agent-auth'

interface RouteContext {
  params: Promise<{ workspaceId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10) || 100),
    500
  )
  const offset = Math.max(
    0,
    parseInt(searchParams.get('offset') ?? '0', 10) || 0
  )
  const folderId = searchParams.get('folderId')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
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
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('position')

    if (folderId) query = query.eq('folder_id', folderId)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: { limit, offset, total: count ?? 0 },
      error: null,
    })
  }

  const agentAuth = await authenticateAgent(
    request.headers.get('authorization'),
    request
  )
  if (agentAuth.rateLimited) {
    return NextResponse.json(
      { data: null, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': String(agentAuth.retryAfterSeconds ?? 60) },
      }
    )
  }
  if (!agentAuth.authenticated || !agentAuth.agentKey) {
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (agentAuth.agentKey.workspace_id !== workspaceId) {
    return NextResponse.json(
      { data: null, error: 'Forbidden' },
      { status: 403 }
    )
  }

  const admin = createAdminClient()
  let query = admin
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('position')

  if (folderId) query = query.eq('folder_id', folderId)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data,
    pagination: { limit, offset, total: count ?? 0 },
    error: null,
  })
}
