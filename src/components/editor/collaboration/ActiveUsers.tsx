"use client";

import type { CollaborationUser } from "@/shared/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActiveUsersProps {
  users: CollaborationUser[];
}

export function ActiveUsers({ users }: ActiveUsersProps) {
  if (users.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {users.map((user) => (
          <Tooltip key={user.clientId}>
            <TooltipTrigger asChild>
              <Avatar
                className="h-8 w-8 border-2"
                style={{ borderColor: user.color }}
              >
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback
                  style={{ backgroundColor: user.color, color: "#fff" }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{user.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
