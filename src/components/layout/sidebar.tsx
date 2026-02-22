'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SidebarHeader } from './sidebar-header'
import { WorkspaceSwitcher } from './workspace-switcher'
import { FolderTree } from './folder-tree'
import { DocumentList } from './document-list'
import { SidebarFooter } from './sidebar-footer'
import type { User, Workspace, Folder, Document } from '@shared/types'

interface SidebarProps {
  user: User
  workspaces: Workspace[]
  currentWorkspace: Workspace
  folders: Folder[]
  documents: Document[]
  activeFolderId?: string
}

export function Sidebar({
  user,
  workspaces,
  currentWorkspace,
  folders,
  documents,
  activeFolderId,
}: SidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <SidebarHeader user={user} workspace={currentWorkspace} />
      <div className="px-2 py-2">
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspace.id}
        />
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="py-2">
          <FolderTree
            folders={folders}
            workspaceId={currentWorkspace.id}
            activeFolderId={activeFolderId}
          />
          <Separator className="my-2" />
          <DocumentList
            documents={documents}
            workspaceId={currentWorkspace.id}
            folderId={activeFolderId}
          />
        </div>
      </ScrollArea>
      <SidebarFooter />
    </aside>
  )
}
