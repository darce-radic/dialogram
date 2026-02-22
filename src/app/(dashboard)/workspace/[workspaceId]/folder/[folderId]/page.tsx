import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { Sidebar } from '@/components/layout/sidebar'
import type { User, Workspace } from '@shared/types'

interface FolderPageProps {
  params: Promise<{ workspaceId: string; folderId: string }>
}

export default async function FolderPage({ params }: FolderPageProps) {
  const { workspaceId, folderId } = await params
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/sign-in')

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    authUser.id,
    workspaceId
  )
  if (!authorized) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (!workspace) redirect('/')

  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .single()

  if (!folder || folder.workspace_id !== workspaceId)
    redirect(`/workspace/${workspaceId}`)

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', authUser.id)

  const workspaceIds = (memberships ?? []).map(
    (m: { workspace_id: string }) => m.workspace_id
  )

  const { data: workspacesData } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds.length > 0 ? workspaceIds : [''])
    .is('deleted_at', null)

  const workspaces = (workspacesData ?? []) as Workspace[]

  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('position')

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('folder_id', folderId)
    .is('deleted_at', null)
    .order('position')

  const user: User = profile ?? {
    id: authUser.id,
    email: authUser.email ?? '',
    full_name: null,
    avatar_url: null,
    created_at: '',
    updated_at: '',
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        workspaces={workspaces}
        currentWorkspace={workspace}
        folders={folders ?? []}
        documents={documents ?? []}
        activeFolderId={folderId}
      />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">{folder.name}</h1>
        <p className="text-muted-foreground">
          {(documents ?? []).length} document{(documents ?? []).length !== 1 ? 's' : ''} in this folder.
        </p>
      </main>
    </div>
  )
}
