"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { createCollaborationProvider } from "../collaboration/provider";
import { setUserAwareness, getConnectedUsers } from "../collaboration/awareness";
import { getColorForUser } from "../utils/color-generator";
import type { CollaborationUser, User } from "@/shared/editor-types";

interface UseCollaborationOptions {
  documentId: string;
  workspaceId: string;
  user: User;
  serverUrl: string;
  token?: string;
  enabled?: boolean;
}

interface UseCollaborationReturn {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  connectedUsers: CollaborationUser[];
  isConnected: boolean;
  isSynced: boolean;
}

export function useCollaboration(
  options: UseCollaborationOptions
): UseCollaborationReturn {
  const { documentId, workspaceId, user, serverUrl, token, enabled = true } = options;
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  // Only recreate the Yjs doc when documentId changes. User identity changes
  // should NOT trigger a new doc — that would reset all collaborative state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  useEffect(() => {
    if (!enabled || !serverUrl) return;

    const provider = createCollaborationProvider({
      documentId,
      workspaceId,
      serverUrl,
      token,
      ydoc,
    });

    providerRef.current = provider;

    setUserAwareness(provider, {
      userId: user.id,
      name: user.name,
      color: getColorForUser(user.id),
      avatarUrl: user.avatarUrl,
    });

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onSynced = ({ state }: { state: boolean }) => setIsSynced(state);
    const onAwarenessUpdate = () => {
      setConnectedUsers(getConnectedUsers(provider));
    };

    provider.on("connect", onConnect);
    provider.on("disconnect", onDisconnect);
    provider.on("synced", onSynced);
    provider.on("awarenessUpdate", onAwarenessUpdate);

    return () => {
      provider.off("connect", onConnect);
      provider.off("disconnect", onDisconnect);
      provider.off("synced", onSynced);
      provider.off("awarenessUpdate", onAwarenessUpdate);
      provider.destroy();
      ydoc.destroy();
      providerRef.current = null;
    };
    // Intentionally omitting `user` object — only user.id is relevant for
    // reconnection. Including the full user object would cause reconnects
    // on profile changes (name, avatar) which is undesirable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, workspaceId, user.id, serverUrl, token, enabled]);

  return {
    ydoc,
    provider: providerRef.current,
    connectedUsers,
    isConnected,
    isSynced,
  };
}
