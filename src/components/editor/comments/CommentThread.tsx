"use client";

import type { CommentThread as CommentThreadType } from "@/shared/types";
import { CommentInput } from "./CommentInput";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  thread: CommentThreadType;
  isActive: boolean;
  resolved?: boolean;
  onClick: () => void;
  onReply: (content: string) => void;
  onResolve: () => void;
}

export function CommentThreadComponent({
  thread,
  isActive,
  resolved,
  onClick,
  onReply,
  onResolve,
}: CommentThreadProps) {
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
        {thread.comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <span className="font-medium text-xs">
              {comment.authorId || "Anonymous"}
            </span>
            <p className="mt-0.5">{comment.content}</p>
          </div>
        ))}
      </div>

      {isActive && !resolved && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <CommentInput onSubmit={onReply} />
        </div>
      )}
    </div>
  );
}
