import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import type { User, Workspace, Folder, Document } from '@shared/types'

export interface WorkspaceLayoutData {
  user: User
  workspace: Workspace
  workspaces: Workspace[]
  folders: Folder[]
  documents: Document[]
  accessToken: string | undefined
}

/**
 * Shared data fetching for workspace layout pages.
 * Returns user, workspace, sidebar data, and the auth session token.
 * Returns null if auth or workspace access fails (caller should redirect).
 */
export async function getWorkspaceLayoutData(
  workspaceId: string
): Promise<WorkspaceLayoutData | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    authUser.id,
    workspaceId
  )
  if (!authorized) return null

  // Fetch all data in parallel
  const [
    { data: profile },
    { data: workspace },
    { data: memberships },
    { data: folders },
    { data: documents },
    { data: sessionData },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', authUser.id).single(),
    supabase.from('workspaces').select('*').eq('id', workspaceId).single(),
    supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', authUser.id),
    supabase
      .from('folders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('position'),
    supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('position'),
    supabase.auth.getSession(),
  ])

  if (!workspace) return null

  const workspaceIds = (memberships ?? []).map(
    (m: { workspace_id: string }) => m.workspace_id
  )

  const { data: workspacesData } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds.length > 0 ? workspaceIds : [''])
    .is('deleted_at', null)

  const user: User = profile ?? {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: null,
    avatar_url: null,
    created_at: '',
    updated_at: '',
  }

  return {
    user,
    workspace: workspace as Workspace,
    workspaces: (workspacesData ?? []) as Workspace[],
    folders: (folders ?? []) as Folder[],
    documents: (documents ?? []) as Document[],
    accessToken: sessionData.session?.access_token,
  }
}
