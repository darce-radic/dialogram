import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import type { WorkspaceRole } from '@shared/types'

export interface UserRouteContext {
  userId: string
  role: WorkspaceRole
  client: Awaited<ReturnType<typeof createClient>>
}

export async function authenticateWorkspaceUser(
  workspaceId: string
): Promise<UserRouteContext | NextResponse> {
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

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    workspaceId
  )
  if (!authorized || !role) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  return {
    userId: user.id,
    role,
    client: supabase,
  }
}

export function isErrorResponse(
  value: UserRouteContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse
}

export function canManageRun(runCreatedBy: string, user: UserRouteContext) {
  return (
    user.userId === runCreatedBy ||
    user.role === 'owner' ||
    user.role === 'admin'
  )
}

export async function parseBody(request: Request) {
  try {
    return await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }
}
