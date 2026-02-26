'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Document } from '@shared/types'

interface DocumentListProps {
  documents: Document[]
  workspaceId: string
  folderId?: string
}

export function DocumentList({
  documents,
  workspaceId,
  folderId,
}: DocumentListProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    let docId: string | null = null

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          folder_id: folderId ?? null,
          title: 'Untitled',
          position: documents.length,
        }),
      })

      const { data } = await response.json()
      if (response.ok && data?.id) {
        docId = data.id as string
      }
    } catch {
      // Network failures are handled by leaving the current UI state.
    }

    setCreating(false)

    if (docId) {
      router.push(`/workspace/${workspaceId}/document/${docId}`)
      router.refresh()
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Documents
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleCreate}
          disabled={creating}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {documents
        .sort((a, b) => a.position - b.position)
        .map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-accent cursor-pointer"
            onClick={() =>
              router.push(`/workspace/${workspaceId}/document/${doc.id}`)
            }
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{doc.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(doc.updated_at)}
            </span>
          </div>
        ))}
      {documents.length === 0 && !creating && (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          No documents yet
        </p>
      )}
    </div>
  )
}
