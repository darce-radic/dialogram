-- Scratchpad events: transparent agent "thinking" log per document
CREATE TABLE public.scratchpad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  agent_key_id uuid NOT NULL REFERENCES public.agent_keys(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'thinking',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scratchpad_events_document
  ON public.scratchpad_events(document_id, created_at DESC);

ALTER TABLE public.scratchpad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read scratchpad events"
  ON public.scratchpad_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = scratchpad_events.document_id
        AND wm.user_id = auth.uid()
    )
  );
