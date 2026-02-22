import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { getWorkspaceLayoutData } from '@/lib/supabase/workspace-data'

interface FolderPageProps {
  params: Promise<{ workspaceId: string; folderId: string }>
}

export default async function FolderPage({ params }: FolderPageProps) {
  const { workspaceId, folderId } = await params

  const data = await getWorkspaceLayoutData(workspaceId)
  if (!data) redirect('/sign-in')

  const { user, workspace, workspaces, folders, documents } = data

  // Verify folder belongs to this workspace
  const supabase = await createClient()
  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', folderId)
    .single()

  if (!folder || folder.workspace_id !== workspaceId)
    redirect(`/workspace/${workspaceId}`)

  const folderDocuments = documents.filter(
    (d) => d.folder_id === folderId
  )

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        workspaces={workspaces}
        currentWorkspace={workspace}
        folders={folders}
        documents={documents}
        activeFolderId={folderId}
      />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">{folder.name}</h1>
        <p className="text-muted-foreground">
          {folderDocuments.length} document{folderDocuments.length !== 1 ? 's' : ''} in this folder.
        </p>
      </main>
    </div>
  )
}
