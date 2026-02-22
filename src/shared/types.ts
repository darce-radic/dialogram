// === Editor-Related Types (proposed by @EditorCore) ===

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
}

export interface LiveTableData {
  columns: { key: string; label: string; sortable?: boolean }[];
  rows: Record<string, string | number | boolean>[];
}
