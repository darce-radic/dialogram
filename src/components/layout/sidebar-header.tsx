'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User, Workspace } from '@shared/types'

interface SidebarHeaderProps {
  user: User
  workspace: Workspace
}

export function SidebarHeader({ user, workspace }: SidebarHeaderProps) {
  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? user.email} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{workspace.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
    </div>
  )
}
