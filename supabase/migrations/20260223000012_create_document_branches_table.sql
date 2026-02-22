-- Document branches: "pull requests for documents"
CREATE TABLE public.document_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  branch_document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'merged', 'rejected')),
  created_by text NOT NULL,
  created_by_type text NOT NULL DEFAULT 'user' CHECK (created_by_type IN ('user', 'agent')),
  merged_by text,
  merged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_branches_source
  ON public.document_branches(source_document_id);

ALTER TABLE public.document_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage branches"
  ON public.document_branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.workspace_members wm ON wm.workspace_id = d.workspace_id
      WHERE d.id = document_branches.source_document_id
        AND wm.user_id = auth.uid()
    )
  );
