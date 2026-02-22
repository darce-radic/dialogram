// =============================================================================
// shared/types.ts — Single source of truth for all Dialogram TypeScript types
// Owner: @Foundation
// All other agents import from here. Do NOT create types elsewhere for DB entities.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Enums
// -----------------------------------------------------------------------------

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export type ThreadType = 'inline' | 'document'

export type AgentRole = 'reader' | 'commenter' | 'editor'

// -----------------------------------------------------------------------------
// 2. Database Row Types (mirrors Supabase tables exactly)
// -----------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  joined_at: string
}

export interface Folder {
  id: string
  workspace_id: string
  parent_folder_id: string | null
  name: string
  position: number
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Document {
  id: string
  workspace_id: string
  folder_id: string | null
  title: string
  content: Record<string, unknown> | null
  position: number
  created_by: string
  last_edited_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CommentThread {
  id: string
  document_id: string
  thread_type: ThreadType
  inline_ref: { from: number; to: number } | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  thread_id: string
  document_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// 3. Insert Types (omit auto-generated fields)
// -----------------------------------------------------------------------------

export type UserInsert = Omit<User, 'created_at' | 'updated_at'>

export type WorkspaceInsert = Omit<
  Workspace,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>

export type WorkspaceMemberInsert = Omit<WorkspaceMember, 'id' | 'joined_at'>

export type FolderInsert = Omit<
  Folder,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>

export type DocumentInsert = Omit<
  Document,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>

export type CommentThreadInsert = Omit<
  CommentThread,
  | 'id'
  | 'resolved'
  | 'resolved_by'
  | 'resolved_at'
  | 'created_at'
  | 'updated_at'
>

export type CommentInsert = Omit<Comment, 'id' | 'created_at' | 'updated_at'>

// -----------------------------------------------------------------------------
// 4. Update Types (all fields optional except id)
// -----------------------------------------------------------------------------

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>> & {
  id: string
}

export type WorkspaceUpdate = Partial<
  Omit<Workspace, 'id' | 'created_at'>
> & { id: string }

export type FolderUpdate = Partial<Omit<Folder, 'id' | 'created_at'>> & {
  id: string
}

export type DocumentUpdate = Partial<
  Omit<Document, 'id' | 'created_at'>
> & { id: string }

// -----------------------------------------------------------------------------
// 5. API Request/Response Types
// -----------------------------------------------------------------------------

export interface ListDocumentsParams {
  workspaceId: string
  folderId?: string
}

export interface CreateDocumentBody {
  workspace_id: string
  title?: string
  folder_id?: string
  content?: Record<string, unknown>
}

export interface UpdateDocumentBody {
  title?: string
  content?: Record<string, unknown>
  folder_id?: string | null
  position?: number
}

export interface ListFoldersParams {
  workspaceId: string
}

export interface CreateFolderBody {
  workspace_id: string
  name: string
  parent_folder_id?: string
}

export interface UpdateFolderBody {
  name?: string
  parent_folder_id?: string | null
  position?: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// -----------------------------------------------------------------------------
// 6. Supabase Database Type (for typed client)
// -----------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: Workspace
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: WorkspaceMember
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: WorkspaceRole
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: WorkspaceRole
          joined_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: Folder
        Insert: {
          id?: string
          workspace_id: string
          parent_folder_id?: string | null
          name: string
          position?: number
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          parent_folder_id?: string | null
          name?: string
          position?: number
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: Document
        Insert: {
          id?: string
          workspace_id: string
          folder_id?: string | null
          title?: string
          content?: Record<string, unknown> | null
          position?: number
          created_by: string
          last_edited_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          folder_id?: string | null
          title?: string
          content?: Record<string, unknown> | null
          position?: number
          created_by?: string
          last_edited_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      comment_threads: {
        Row: CommentThread
        Insert: {
          id?: string
          document_id: string
          thread_type?: ThreadType
          inline_ref?: { from: number; to: number } | null
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          thread_type?: ThreadType
          inline_ref?: { from: number; to: number } | null
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: Comment
        Insert: {
          id?: string
          thread_id: string
          document_id: string
          author_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          document_id?: string
          author_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_keys: {
        Row: AgentKey
        Insert: {
          id?: string
          workspace_id: string
          name: string
          key_prefix: string
          key_hash: string
          role?: AgentRole
          permissions?: Record<string, unknown>
          created_by: string
          is_active?: boolean
          last_used_at?: string | null
          webhook_url?: string | null
          webhook_secret?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          key_prefix?: string
          key_hash?: string
          role?: AgentRole
          permissions?: Record<string, unknown>
          created_by?: string
          is_active?: boolean
          last_used_at?: string | null
          webhook_url?: string | null
          webhook_secret?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scratchpad_events: {
        Row: ScratchpadEvent
        Insert: {
          id?: string
          document_id: string
          agent_key_id: string
          event_type?: ScratchpadEventType
          content: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          agent_key_id?: string
          event_type?: ScratchpadEventType
          content?: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      document_branches: {
        Row: DocumentBranch
        Insert: {
          id?: string
          source_document_id: string
          branch_document_id: string
          branch_name: string
          status?: BranchStatus
          created_by: string
          created_by_type?: 'user' | 'agent'
          merged_by?: string | null
          merged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_document_id?: string
          branch_document_id?: string
          branch_name?: string
          status?: BranchStatus
          created_by?: string
          created_by_type?: 'user' | 'agent'
          merged_by?: string | null
          merged_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_memories: {
        Row: AgentMemory
        Insert: {
          id?: string
          agent_key_id: string
          workspace_id: string
          document_id?: string | null
          content: string
          embedding?: number[] | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_key_id?: string
          workspace_id?: string
          document_id?: string | null
          content?: string
          embedding?: number[] | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      workspace_role: WorkspaceRole
      thread_type: ThreadType
      agent_role: AgentRole
      scratchpad_event_type: ScratchpadEventType
      branch_status: BranchStatus
    }
    CompositeTypes: Record<string, never>
  }
}

// -----------------------------------------------------------------------------
// 7. Agent Types (@AgentCore)
// -----------------------------------------------------------------------------

export interface AgentKey {
  id: string
  workspace_id: string
  name: string
  key_prefix: string
  key_hash: string
  role: AgentRole
  permissions: Record<string, unknown>
  created_by: string
  is_active: boolean
  last_used_at: string | null
  webhook_url: string | null
  webhook_secret: string | null
  created_at: string
  updated_at: string
}

export type AgentKeyInsert = Omit<
  AgentKey,
  'id' | 'is_active' | 'last_used_at' | 'created_at' | 'updated_at'
>

export type AgentKeyUpdate = Partial<
  Omit<AgentKey, 'id' | 'created_at' | 'key_hash'>
> & { id: string }

// -----------------------------------------------------------------------------
// 8. Scratchpad Types
// -----------------------------------------------------------------------------

export type ScratchpadEventType = 'thinking' | 'tool_use' | 'progress' | 'error'

export interface ScratchpadEvent {
  id: string
  document_id: string
  agent_key_id: string
  event_type: ScratchpadEventType
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

// -----------------------------------------------------------------------------
// 9. Document Branch Types
// -----------------------------------------------------------------------------

export type BranchStatus = 'open' | 'merged' | 'rejected'

export interface DocumentBranch {
  id: string
  source_document_id: string
  branch_document_id: string
  branch_name: string
  status: BranchStatus
  created_by: string
  created_by_type: 'user' | 'agent'
  merged_by: string | null
  merged_at: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// 10. Agent Memory Types
// -----------------------------------------------------------------------------

export interface AgentMemory {
  id: string
  agent_key_id: string
  workspace_id: string
  document_id: string | null
  content: string
  embedding: number[] | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
