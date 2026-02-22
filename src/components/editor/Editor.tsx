"use client";

import { useEditorInstance } from "@/lib/editor/hooks/use-editor";
import { useCollaboration } from "@/lib/editor/hooks/use-collaboration";
import { useComments } from "@/lib/editor/hooks/use-comments";
import { CommentMark } from "@/lib/editor/extensions/comment-mark";
import { getColorForUser } from "@/lib/editor/utils/color-generator";
import { Toolbar } from "./Toolbar";
import { EditorBubbleMenu } from "./BubbleMenu";
import { EditorContentArea } from "./EditorContent";
import { ActiveUsers } from "./collaboration/ActiveUsers";
import { CursorPresence } from "./collaboration/CursorPresence";
import { CommentSidebar } from "./comments/CommentSidebar";
import type { User } from "@/shared/types";

interface EditorProps {
  documentId: string;
  workspaceId: string;
  user: User;
  collaborationUrl?: string;
  token?: string;
}

export function Editor({
  documentId,
  workspaceId,
  user,
  collaborationUrl,
  token,
}: EditorProps) {
  const collaboration = collaborationUrl
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useCollaboration({
        documentId,
        workspaceId,
        user,
        serverUrl: collaborationUrl,
        token,
      })
    : null;

  const editor = useEditorInstance({
    content: collaboration ? undefined : "<p>Start writing...</p>",
    collaboration:
      collaboration?.provider
        ? {
            ydoc: collaboration.ydoc,
            provider: collaboration.provider,
            user: { name: user.name, color: getColorForUser(user.id) },
          }
        : undefined,
    additionalExtensions: [CommentMark],
  });

  const comments = useComments({
    editor,
    ydoc: collaboration?.ydoc ?? null,
    documentId,
  });

  return (
    <div className="flex w-full h-full bg-background">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between border-b">
          <Toolbar editor={editor} />
          <div className="flex items-center gap-3 pr-4">
            {collaboration && (
              <CursorPresence
                isConnected={collaboration.isConnected}
                isSynced={collaboration.isSynced}
              />
            )}
            {collaboration && (
              <ActiveUsers users={collaboration.connectedUsers} />
            )}
          </div>
        </div>
        {editor && <EditorBubbleMenu editor={editor} />}
        <EditorContentArea editor={editor} />
      </div>

      <CommentSidebar
        threads={comments.threads}
        activeThreadId={comments.activeThreadId}
        onSelectThread={comments.setActiveThreadId}
        onReply={(threadId, content) =>
          comments.addReply(threadId, content, user.id)
        }
        onResolve={(threadId) => comments.resolveThread(threadId, user.id)}
      />
    </div>
  );
}
