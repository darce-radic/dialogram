'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Folder as FolderIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { Folder } from '@shared/types'

interface FolderTreeProps {
  folders: Folder[]
  workspaceId: string
  activeFolderId?: string
}

interface FolderNodeProps {
  folder: Folder
  subFolders: Folder[]
  allFolders: Folder[]
  workspaceId: string
  activeFolderId?: string
}

function FolderNode({
  folder,
  subFolders,
  allFolders,
  workspaceId,
  activeFolderId,
}: FolderNodeProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const hasChildren = subFolders.length > 0
  const isActive = folder.id === activeFolderId

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
          isActive ? 'bg-accent' : ''
        }`}
        onClick={() =>
          router.push(`/workspace/${workspaceId}/folder/${folder.id}`)
        }
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
        ) : (
          <span className="w-5" />
        )}
        <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{folder.name}</span>
      </div>
      {hasChildren && (
        <CollapsibleContent className="ml-4">
          {subFolders
            .sort((a, b) => a.position - b.position)
            .map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                subFolders={allFolders.filter(
                  (f) => f.parent_folder_id === child.id
                )}
                allFolders={allFolders}
                workspaceId={workspaceId}
                activeFolderId={activeFolderId}
              />
            ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export function FolderTree({
  folders,
  workspaceId,
  activeFolderId,
}: FolderTreeProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const rootFolders = folders
    .filter((f) => !f.parent_folder_id)
    .sort((a, b) => a.position - b.position)

  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreating(false)
      return
    }

    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: newName.trim(),
          position: folders.length,
        }),
      })
    } catch {
      // Silently handle network errors
    }

    setNewName('')
    setCreating(false)
    router.refresh()
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {creating && (
        <div className="px-2">
          <input
            className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            onBlur={handleCreate}
            autoFocus
          />
        </div>
      )}
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          subFolders={folders.filter(
            (f) => f.parent_folder_id === folder.id
          )}
          allFolders={folders}
          workspaceId={workspaceId}
          activeFolderId={activeFolderId}
        />
      ))}
    </div>
  )
}
