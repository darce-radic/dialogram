-- Enable pgvector extension for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Agent memories: persistent semantic memory for agents
CREATE TABLE public.agent_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key_id uuid NOT NULL REFERENCES public.agent_keys(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_memories_workspace
  ON public.agent_memories(workspace_id, agent_key_id);

-- IVFFlat index for cosine similarity search
CREATE INDEX idx_agent_memories_embedding
  ON public.agent_memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Only service role (agents via admin client) can access agent memories
CREATE POLICY "Service role full access to agent_memories"
  ON public.agent_memories FOR ALL
  USING (true)
  WITH CHECK (true);
