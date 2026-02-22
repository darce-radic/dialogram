import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkspaceRole } from '@shared/types'

interface MembershipResult {
  authorized: boolean
  role?: WorkspaceRole
}

/**
 * Verify that a user is a member of the given workspace.
 * Returns the membership role if authorized.
 * Used as defense-in-depth on top of RLS policies.
 */
export async function requireWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<MembershipResult> {
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!data) {
    return { authorized: false }
  }

  return { authorized: true, role: data.role as WorkspaceRole }
}
