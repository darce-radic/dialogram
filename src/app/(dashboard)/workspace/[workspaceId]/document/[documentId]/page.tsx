import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Editor } from '@/components/editor/Editor'
import { getWorkspaceLayoutData } from '@/lib/supabase/workspace-data'

interface DocumentPageProps {
  params: Promise<{ workspaceId: string; documentId: string }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { workspaceId, documentId } = await params

  const data = await getWorkspaceLayoutData(workspaceId)
  if (!data) redirect('/sign-in')

  const { user, workspace, workspaces, folders, documents, accessToken } = data

  // Verify document belongs to this workspace
  const supabase = await createClient()
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (!document || document.workspace_id !== workspaceId)
    redirect(`/workspace/${workspaceId}`)

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
        folders={folders}
        documents={documents}
        activeFolderId={document.folder_id ?? undefined}
      />
      <main className="flex-1 overflow-hidden">
        <Editor
          documentId={documentId}
          workspaceId={workspaceId}
          user={editorUser}
          collaborationUrl={collaborationUrl}
          token={accessToken}
        />
      </main>
    </div>
  )
}
