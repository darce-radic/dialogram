import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { CollaborationUser } from "@/shared/types";

export function setUserAwareness(
  provider: HocuspocusProvider,
  user: Omit<CollaborationUser, "clientId">
): void {
  provider.setAwarenessField("user", {
    name: user.name,
    color: user.color,
    userId: user.userId,
    avatarUrl: user.avatarUrl,
  });
}

export function getConnectedUsers(
  provider: HocuspocusProvider
): CollaborationUser[] {
  const states = provider.awareness?.getStates();
  if (!states) return [];

  const users: CollaborationUser[] = [];
  states.forEach((state, clientId) => {
    if (state.user) {
      users.push({ clientId, ...state.user });
    }
  });
  return users;
}
