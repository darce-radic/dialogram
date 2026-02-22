"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useEditorInstance } from "@/lib/editor/hooks/use-editor";
import { useCollaboration } from "@/lib/editor/hooks/use-collaboration";
import { useComments } from "@/lib/editor/hooks/use-comments";
import { useScratchpad } from "@/lib/editor/hooks/use-scratchpad";
import { CommentMark } from "@/lib/editor/extensions/comment-mark";
import { getColorForUser } from "@/lib/editor/utils/color-generator";
import { Toolbar } from "./Toolbar";
import { EditorBubbleMenu } from "./BubbleMenu";
import { EditorContentArea } from "./EditorContent";
import { ActiveUsers } from "./collaboration/ActiveUsers";
import { CursorPresence } from "./collaboration/CursorPresence";
import { CommentSidebar } from "./comments/CommentSidebar";
import { ScratchpadPanel } from "./scratchpad/ScratchpadPanel";
import { BranchList } from "./branches/BranchList";
import { BranchDiffView } from "./branches/BranchDiffView";
import { Button } from "@/components/ui/button";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { MessageSquare, Brain, GitBranch } from "lucide-react";
import Mention from "@tiptap/extension-mention";
import { createMentionSuggestion } from "@/lib/editor/extensions/mention-suggestion";
import type { MentionUser } from "@/components/editor/mentions/MentionList";
import type { User } from "@/shared/editor-types";
import type { DocumentBranch } from "@shared/types";

type RightPanel = "comments" | "scratchpad" | "branches" | "branch-diff" | null;

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
  const [workspaceMembers, setWorkspaceMembers] = useState<MentionUser[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [activePanel, setActivePanel] = useState<RightPanel>("comments");
  const [branches, setBranches] = useState<DocumentBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<{
    branch: DocumentBranch;
    sourceContent: string;
    branchContent: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          setWorkspaceMembers(
            data.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              name: (m.full_name as string) || (m.email as string) || "Unknown",
              email: (m.email as string) || "",
              avatarUrl: m.avatar_url as string | undefined,
            }))
          );
        }
      })
      .catch(() => {});

    fetch(`/api/agent-keys/names?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          const map: Record<string, string> = {};
          for (const agent of data) {
            map[agent.id] = agent.name;
          }
          setAgentNames(map);
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  // Fetch branches
  useEffect(() => {
    fetch(`/api/documents/${documentId}/branches`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          setBranches(data);
        }
      })
      .catch(() => {});
  }, [documentId]);

  const mentionExtension = useMemo(
    () =>
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: createMentionSuggestion(workspaceMembers),
      }),
    [workspaceMembers]
  );

  const collaboration = useCollaboration({
    documentId,
    workspaceId,
    user,
    serverUrl: collaborationUrl ?? "",
    token,
    enabled: !!collaborationUrl,
  });

  const isCollabActive = !!collaborationUrl && !!collaboration.provider;

  const editor = useEditorInstance({
    content: collaborationUrl ? undefined : "<p>Start writing...</p>",
    collaboration: isCollabActive
      ? {
          ydoc: collaboration.ydoc,
          provider: collaboration.provider!,
          user: { name: user.name, color: getColorForUser(user.id) },
        }
      : undefined,
    additionalExtensions: [CommentMark, mentionExtension],
  });

  const comments = useComments({
    editor,
    ydoc: collaborationUrl ? collaboration.ydoc : null,
    documentId,
  });

  const scratchpad = useScratchpad(documentId);

  const togglePanel = (panel: RightPanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
    setSelectedBranch(null);
  };

  const handleSelectBranch = useCallback(
    (branch: DocumentBranch) => {
      fetch(`/api/documents/${documentId}/branches/${branch.id}`)
        .then((res) => res.json())
        .then(({ data }) => {
          if (data) {
            const sourceText = JSON.stringify(
              data.sourceDocument?.content ?? {},
              null,
              2
            );
            const branchText = JSON.stringify(
              data.branchDocument?.content ?? {},
              null,
              2
            );
            setSelectedBranch({
              branch: data.branch,
              sourceContent: sourceText,
              branchContent: branchText,
            });
            setActivePanel("branch-diff");
          }
        })
        .catch(() => {});
    },
    [documentId]
  );

  const handleBranchAction = useCallback(
    (status: "merged" | "rejected") => {
      if (!selectedBranch) return;
      fetch(
        `/api/documents/${documentId}/branches/${selectedBranch.branch.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )
        .then((res) => res.json())
        .then(({ data }) => {
          if (data) {
            setBranches((prev) =>
              prev.map((b) => (b.id === data.id ? data : b))
            );
            setSelectedBranch(null);
            setActivePanel("branches");
          }
        })
        .catch(() => {});
    },
    [documentId, selectedBranch]
  );

  return (
    <EditorErrorBoundary>
    <div className="flex w-full h-full bg-background">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between border-b">
          <Toolbar editor={editor} />
          <div className="flex items-center gap-2 pr-4">
            <Button
              size="icon"
              variant={activePanel === "comments" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => togglePanel("comments")}
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={activePanel === "scratchpad" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => togglePanel("scratchpad")}
              title="Agent Scratchpad"
            >
              <Brain className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={
                activePanel === "branches" || activePanel === "branch-diff"
                  ? "default"
                  : "ghost"
              }
              className="h-7 w-7"
              onClick={() => togglePanel("branches")}
              title="Branches"
            >
              <GitBranch className="h-4 w-4" />
            </Button>
            {isCollabActive && (
              <CursorPresence
                isConnected={collaboration.isConnected}
                isSynced={collaboration.isSynced}
              />
            )}
            {isCollabActive && (
              <ActiveUsers users={collaboration.connectedUsers} />
            )}
          </div>
        </div>
        {editor && <EditorBubbleMenu editor={editor} />}
        <EditorContentArea editor={editor} />
      </div>

      {activePanel === "comments" && (
        <CommentSidebar
          threads={comments.threads}
          activeThreadId={comments.activeThreadId}
          agentNames={agentNames}
          onSelectThread={comments.setActiveThreadId}
          onReply={(threadId, content) =>
            comments.addReply(threadId, content, user.id)
          }
          onResolve={(threadId) => comments.resolveThread(threadId, user.id)}
        />
      )}

      {activePanel === "scratchpad" && (
        <ScratchpadPanel
          events={scratchpad.events}
          isConnected={scratchpad.isConnected}
          agentNames={agentNames}
        />
      )}

      {activePanel === "branches" && (
        <BranchList branches={branches} onSelectBranch={handleSelectBranch} />
      )}

      {activePanel === "branch-diff" && selectedBranch && (
        <BranchDiffView
          branchName={selectedBranch.branch.branch_name}
          sourceContent={selectedBranch.sourceContent}
          branchContent={selectedBranch.branchContent}
          status={selectedBranch.branch.status}
          onApprove={() => handleBranchAction("merged")}
          onReject={() => handleBranchAction("rejected")}
          onBack={() => setActivePanel("branches")}
        />
      )}
    </div>
    </EditorErrorBoundary>
  );
}
