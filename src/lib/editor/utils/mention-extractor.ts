import type { Editor } from '@tiptap/react'
import type { MentionUser } from '@/components/editor/mentions/MentionList'

export interface MentionTarget {
  id: string
  type: 'user' | 'agent'
}

function normalizeMentionType(raw: unknown): 'user' | 'agent' {
  return raw === 'agent' ? 'agent' : 'user'
}

export function extractMentionsFromSelection(
  editor: Editor,
  from: number,
  to: number
): MentionTarget[] {
  const mentions = new Map<string, MentionTarget>()

  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.type.name !== 'mention') return

    const id = typeof node.attrs.id === 'string' ? node.attrs.id : ''
    if (!id) return

    const type = normalizeMentionType(node.attrs.type)
    mentions.set(`${type}:${id}`, { id, type })
  })

  return Array.from(mentions.values())
}

export function extractMentionsFromText(
  text: string,
  directory: MentionUser[]
): MentionTarget[] {
  const tags = Array.from(text.matchAll(/@([A-Za-z0-9._-]+)/g)).map(
    (m) => m[1]?.toLowerCase()
  )
  if (tags.length === 0) return []

  const directoryByName = new Map(
    directory.map((entry) => [entry.name.toLowerCase(), entry])
  )
  const mentions = new Map<string, MentionTarget>()

  for (const tag of tags) {
    if (!tag) continue
    const match = directoryByName.get(tag)
    if (!match) continue
    const type = match.type === 'agent' ? 'agent' : 'user'
    mentions.set(`${type}:${match.id}`, {
      id: match.id,
      type,
    })
  }

  return Array.from(mentions.values())
}

