import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

interface RouteContext {
  params: Promise<{ workspaceId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params
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

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10) || 100), 500)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)

  const { data: members, error, count } = await supabase
    .from('workspace_members')
    .select('user_id, role, users(id, full_name, email, avatar_url)', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  const users = (members ?? []).map((m: Record<string, unknown>) => {
    const u = m.users as Record<string, unknown> | null
    return {
      id: u?.id ?? m.user_id,
      full_name: u?.full_name ?? null,
      email: u?.email ?? null,
      avatar_url: u?.avatar_url ?? null,
      role: m.role,
    }
  })

  return NextResponse.json({ data: users, pagination: { limit, offset, total: count ?? 0 }, error: null })
}
