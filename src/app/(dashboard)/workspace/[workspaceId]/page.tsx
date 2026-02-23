import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { CreateWorkspaceForm } from '@/components/workspace/create-workspace-form'
import { getWorkspaceLayoutData } from '@/lib/supabase/workspace-data'

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params

  // Handle "new" workspace route
  if (workspaceId === 'new') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Welcome to Dialogram</h1>
            <p className="text-muted-foreground">
              Create your first workspace to get started.
            </p>
          </div>
          <CreateWorkspaceForm />
        </div>
      </div>
    )
  }

  const data = await getWorkspaceLayoutData(workspaceId)
  if (!data) redirect('/sign-in')

  const { user, workspace, workspaces, folders, documents } = data

  return (
    <div className="flex h-screen">
      <Sidebar
        user={user}
        workspaces={workspaces}
        currentWorkspace={workspace}
        folders={folders}
        documents={documents}
      />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">{workspace.name}</h1>
        <p className="text-muted-foreground">
          Select a document from the sidebar or create a new one.
        </p>
      </main>
    </div>
  )
}
