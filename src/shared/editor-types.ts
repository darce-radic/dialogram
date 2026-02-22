// =============================================================================
// src/shared/editor-types.ts — Client-side camelCase view models for the editor.
// These are NOT database row types. DB types live in shared/types.ts (@shared/*).
// The use-comments hook maps from DB snake_case → these camelCase shapes.
// =============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface DocumentMeta {
  id: string;
  title: string;
  workspaceId: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CommentThread {
  id: string;
  documentId: string;
  threadType: "inline" | "document";
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  createdBy: string;
  anchorFrom: number;
  anchorTo: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CollaborationUser {
  clientId: number;
  userId: string;
  name: string;
  color: string;
  avatarUrl?: string;
  isAgent?: boolean;
  agentRole?: string;
}

export interface LiveTableData {
  columns: { key: string; label: string; sortable?: boolean }[];
  rows: Record<string, string | number | boolean>[];
}
