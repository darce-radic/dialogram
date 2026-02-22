-- Fix C2: Drop FK constraints on comment_threads and comments so agent key IDs can be stored.
-- Agent-authored comments use agent_key.id as created_by/author_id, which is not in users table.
-- We keep the uuid type but remove the FK reference to allow polymorphic IDs.

ALTER TABLE public.comment_threads DROP CONSTRAINT IF EXISTS comment_threads_created_by_fkey;
ALTER TABLE public.comment_threads DROP CONSTRAINT IF EXISTS comment_threads_resolved_by_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;

-- Fix H4: Change document_branches.created_by and merged_by from text to uuid for consistency.
ALTER TABLE public.document_branches ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
ALTER TABLE public.document_branches ALTER COLUMN merged_by TYPE uuid USING merged_by::uuid;

-- Fix H3: Replace the overly permissive RLS policy on agent_memories.
-- Service role already bypasses RLS, so we just need to block direct access from anon/authenticated roles.
DROP POLICY IF EXISTS "Service role full access to agent_memories" ON public.agent_memories;
CREATE POLICY "No public access to agent_memories"
  ON public.agent_memories FOR ALL
  USING (false);

-- Fix M5: Replace IVFFlat index with HNSW (does not require training data).
DROP INDEX IF EXISTS idx_agent_memories_embedding;
CREATE INDEX idx_agent_memories_embedding
  ON public.agent_memories
  USING hnsw (embedding vector_cosine_ops);

-- Fix C1: Create parameterized RPC function for vector similarity search.
CREATE OR REPLACE FUNCTION match_agent_memories(
  query_embedding vector(1536),
  match_workspace_id uuid,
  match_document_id uuid DEFAULT NULL,
  match_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  agent_key_id uuid,
  workspace_id uuid,
  document_id uuid,
  content text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT
    am.id,
    am.agent_key_id,
    am.workspace_id,
    am.document_id,
    am.content,
    am.embedding,
    am.metadata,
    am.created_at,
    am.updated_at,
    1 - (am.embedding <=> query_embedding) AS similarity
  FROM public.agent_memories am
  WHERE am.workspace_id = match_workspace_id
    AND am.embedding IS NOT NULL
    AND (match_document_id IS NULL OR am.document_id = match_document_id)
  ORDER BY am.embedding <=> query_embedding
  LIMIT match_limit;
$$;
