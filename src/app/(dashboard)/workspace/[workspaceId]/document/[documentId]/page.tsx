import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { Sidebar } from '@/components/layout/sidebar'
import { Editor } from '@/components/editor/Editor'
import type { User, Workspace } from '@shared/types'

interface DocumentPageProps {
  params: Promise<{ workspaceId: string; documentId: string }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { workspaceId, documentId } = await params
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

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (!document || document.workspace_id !== workspaceId)
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

  // Map Foundation User type to Editor User type
  const editorUser = {
    id: user.id,
    name: user.full_name ?? user.email,
    email: user.email,
    avatarUrl: user.avatar_url ?? undefined,
  }

  const collaborationUrl =
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || undefined

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        workspaces={workspaces}
        currentWorkspace={workspace}
        folders={folders ?? []}
        documents={documents ?? []}
        activeFolderId={document.folder_id ?? undefined}
      />
      <main className="flex-1 overflow-hidden">
        <Editor
          documentId={documentId}
          workspaceId={workspaceId}
          user={editorUser}
          collaborationUrl={collaborationUrl}
        />
      </main>
    </div>
  )
}
