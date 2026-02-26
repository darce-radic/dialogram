-- Add structured metadata for comments (agent communication contract, etc.)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

