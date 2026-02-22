"use client";

import type { CollaborationUser } from "@/shared/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot } from "lucide-react";

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
              <div className="relative">
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
                {user.isAgent && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {user.name}
              {user.isAgent ? " (Agent)" : ""}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
