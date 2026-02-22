'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Workspace } from '@shared/types'

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentWorkspaceId: string
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const current = workspaces.find((w) => w.id === currentWorkspaceId)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const { data: workspace } = await res.json()

      if (workspace) {
        setShowCreate(false)
        setNewName('')
        router.push(`/workspace/${workspace.id}`)
        router.refresh()
      }
    } catch {
      // Silently handle network errors
    }

    setCreating(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2"
          >
            <span className="truncate">{current?.name ?? 'Select workspace'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => router.push(`/workspace/${ws.id}`)}
            >
              <Check
                className={`mr-2 h-4 w-4 ${ws.id === currentWorkspaceId ? 'opacity-100' : 'opacity-0'}`}
              />
              {ws.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create workspace</DialogTitle>
              <DialogDescription>
                Add a new workspace to organize your documents and team.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                id="workspace-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Workspace"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
