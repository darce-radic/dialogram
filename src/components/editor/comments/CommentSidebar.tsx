"use client";

import type { CommentThread } from "@/shared/types";
import { CommentThreadComponent } from "./CommentThread";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

interface CommentSidebarProps {
  threads: CommentThread[];
  activeThreadId: string | null;
  agentNames?: Record<string, string>;
  onSelectThread: (id: string) => void;
  onReply: (threadId: string, content: string) => void;
  onResolve: (threadId: string) => void;
}

export function CommentSidebar({
  threads,
  activeThreadId,
  agentNames,
  onSelectThread,
  onReply,
  onResolve,
}: CommentSidebarProps) {
  const unresolvedThreads = threads.filter((t) => !t.resolvedAt);
  const resolvedThreads = threads.filter((t) => t.resolvedAt);

  return (
    <aside className="w-80 border-l bg-background flex flex-col">
      <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments ({unresolvedThreads.length})
      </div>
      <ScrollArea className="flex-1">
        {unresolvedThreads.length === 0 && resolvedThreads.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No comments yet. Select text and add a comment to start a
            discussion.
          </div>
        )}
        {unresolvedThreads.map((thread) => (
          <CommentThreadComponent
            key={thread.id}
            thread={thread}
            isActive={thread.id === activeThreadId}
            agentNames={agentNames}
            onClick={() => onSelectThread(thread.id)}
            onReply={(content) => onReply(thread.id, content)}
            onResolve={() => onResolve(thread.id)}
          />
        ))}
        {resolvedThreads.length > 0 && (
          <>
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium border-t">
              Resolved ({resolvedThreads.length})
            </div>
            {resolvedThreads.map((thread) => (
              <CommentThreadComponent
                key={thread.id}
                thread={thread}
                isActive={thread.id === activeThreadId}
                agentNames={agentNames}
                onClick={() => onSelectThread(thread.id)}
                onReply={(content) => onReply(thread.id, content)}
                onResolve={() => onResolve(thread.id)}
                resolved
              />
            ))}
          </>
        )}
      </ScrollArea>
    </aside>
  );
}
