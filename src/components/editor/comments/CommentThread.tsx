"use client";

import type { CommentThread as CommentThreadType } from "@/shared/types";
import { CommentInput } from "./CommentInput";
import { Button } from "@/components/ui/button";
import { Check, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  thread: CommentThreadType;
  isActive: boolean;
  resolved?: boolean;
  agentNames?: Record<string, string>;
  onClick: () => void;
  onReply: (content: string) => void;
  onResolve: () => void;
}

export function CommentThreadComponent({
  thread,
  isActive,
  resolved,
  agentNames,
  onClick,
  onReply,
  onResolve,
}: CommentThreadProps) {
  const getAuthorDisplay = (authorId: string) => {
    const agentName = agentNames?.[authorId];
    if (agentName) {
      return { name: agentName, isAgent: true };
    }
    return { name: authorId || "Anonymous", isAgent: false };
  };

  return (
    <div
      className={cn(
        "border-b px-4 py-3 cursor-pointer transition-colors",
        isActive && "bg-accent",
        resolved && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {new Date(thread.createdAt).toLocaleDateString()}
        </span>
        {!resolved && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            title="Resolve thread"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {thread.comments.map((comment) => {
          const author = getAuthorDisplay(comment.authorId);
          return (
            <div key={comment.id} className="text-sm">
              <span className="font-medium text-xs inline-flex items-center gap-1">
                {author.isAgent && <Bot className="h-3 w-3 text-primary" />}
                {author.name}
              </span>
              <p className="mt-0.5">{comment.content}</p>
            </div>
          );
        })}
      </div>

      {isActive && !resolved && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <CommentInput onSubmit={onReply} />
        </div>
      )}
    </div>
  );
}
