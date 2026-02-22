"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { CommentThread } from "@/shared/editor-types";
import * as Y from "yjs";

interface UseCommentsOptions {
  editor: Editor | null;
  ydoc: Y.Doc | null;
  documentId: string;
}

interface UseCommentsReturn {
  threads: CommentThread[];
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  createThread: (content: string, authorId: string) => CommentThread | null;
  addReply: (threadId: string, content: string, authorId: string) => void;
  resolveThread: (threadId: string, userId: string) => void;
}

// Fire-and-forget API persistence (best-effort, Yjs is source of truth for real-time)
function persistThread(
  documentId: string,
  thread: CommentThread
) {
  fetch(`/api/documents/${documentId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: thread.id,
      thread_type: "inline",
      inline_ref: { from: thread.anchorFrom, to: thread.anchorTo },
      content: thread.comments[0]?.content ?? "",
      comment_id: thread.comments[0]?.id,
    }),
  }).catch(() => {});
}

function persistReply(
  documentId: string,
  threadId: string,
  commentId: string,
  content: string
) {
  fetch(`/api/documents/${documentId}/threads/${threadId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: commentId, content }),
  }).catch(() => {});
}

function persistResolve(documentId: string, threadId: string) {
  fetch(`/api/documents/${documentId}/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resolved: true }),
  }).catch(() => {});
}

export function useComments({
  editor,
  ydoc,
  documentId,
}: UseCommentsOptions): UseCommentsReturn {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load threads from DB on mount and populate Yjs map
  useEffect(() => {
    if (!ydoc || loadedRef.current) return;
    loadedRef.current = true;

    fetch(`/api/documents/${documentId}/threads`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (!data || !Array.isArray(data)) return;
        const yThreads = ydoc.getMap<CommentThread>("comment-threads");

        for (const dbThread of data) {
          // Skip if already in Yjs (another client loaded it)
          if (yThreads.has(dbThread.id)) continue;

          const thread: CommentThread = {
            id: dbThread.id,
            documentId: dbThread.document_id,
            threadType: dbThread.thread_type ?? "inline",
            anchorFrom: dbThread.inline_ref?.from ?? 0,
            anchorTo: dbThread.inline_ref?.to ?? 0,
            createdAt: dbThread.created_at,
            createdBy: dbThread.created_by,
            resolvedAt: dbThread.resolved_at ?? undefined,
            resolvedBy: dbThread.resolved_by ?? undefined,
            comments: (dbThread.comments ?? []).map(
              (c: Record<string, unknown>) => ({
                id: c.id,
                threadId: c.thread_id,
                authorId: c.author_id,
                content: c.body,
                createdAt: c.created_at,
                updatedAt: c.updated_at ?? undefined,
              })
            ),
          };
          yThreads.set(dbThread.id, thread);
        }
      })
      .catch(() => {});
  }, [ydoc, documentId]);

  // Observe Yjs map for real-time updates
  useEffect(() => {
    if (!ydoc) return;
    const yThreads = ydoc.getMap<CommentThread>("comment-threads");

    const observer = () => {
      const allThreads: CommentThread[] = [];
      yThreads.forEach((thread) => allThreads.push(thread));
      allThreads.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setThreads(allThreads);
    };

    yThreads.observe(observer);
    observer();
    return () => yThreads.unobserve(observer);
  }, [ydoc]);

  const createThread = useCallback(
    (content: string, authorId: string): CommentThread | null => {
      if (!editor || !ydoc) return null;
      const { from, to } = editor.state.selection;
      if (from === to) return null;

      const threadId = crypto.randomUUID();
      const now = new Date().toISOString();

      const thread: CommentThread = {
        id: threadId,
        documentId,
        threadType: "inline",
        anchorFrom: from,
        anchorTo: to,
        createdAt: now,
        createdBy: authorId,
        comments: [
          {
            id: crypto.randomUUID(),
            threadId,
            authorId,
            content,
            createdAt: now,
          },
        ],
      };

      editor.chain().focus().setComment(threadId).run();

      const yThreads = ydoc.getMap<CommentThread>("comment-threads");
      yThreads.set(threadId, thread);

      // Persist to DB
      persistThread(documentId, thread);

      setActiveThreadId(threadId);
      return thread;
    },
    [editor, ydoc, documentId]
  );

  const addReply = useCallback(
    (threadId: string, content: string, authorId: string) => {
      if (!ydoc) return;
      const yThreads = ydoc.getMap<CommentThread>("comment-threads");
      const thread = yThreads.get(threadId);
      if (!thread) return;

      const commentId = crypto.randomUUID();

      const updatedThread: CommentThread = {
        ...thread,
        comments: [
          ...thread.comments,
          {
            id: commentId,
            threadId,
            authorId,
            content,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      yThreads.set(threadId, updatedThread);

      // Persist to DB
      persistReply(documentId, threadId, commentId, content);
    },
    [ydoc, documentId]
  );

  const resolveThread = useCallback(
    (threadId: string, userId: string) => {
      if (!ydoc) return;
      const yThreads = ydoc.getMap<CommentThread>("comment-threads");
      const thread = yThreads.get(threadId);
      if (!thread) return;

      yThreads.set(threadId, {
        ...thread,
        resolvedAt: new Date().toISOString(),
        resolvedBy: userId,
      });

      // Persist to DB
      persistResolve(documentId, threadId);
    },
    [ydoc, documentId]
  );

  return {
    threads,
    activeThreadId,
    setActiveThreadId,
    createThread,
    addReply,
    resolveThread,
  };
}
