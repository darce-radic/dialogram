-- Multi-agent orchestration V1

CREATE TYPE public.agent_run_status AS ENUM (
  'active',
  'blocked',
  'completed',
  'cancelled'
);

CREATE TYPE public.agent_task_status AS ENUM (
  'todo',
  'in_progress',
  'blocked',
  'done'
);

CREATE TYPE public.agent_task_type AS ENUM (
  'research',
  'write',
  'review',
  'qa',
  'synthesis'
);

CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coordinator_agent_key_id uuid NOT NULL REFERENCES public.agent_keys(id) ON DELETE RESTRICT,
  status public.agent_run_status NOT NULL DEFAULT 'active',
  objective text NOT NULL,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_parallel_agents int NOT NULL DEFAULT 3 CHECK (max_parallel_agents BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_workspace_doc_status
  ON public.agent_runs(workspace_id, document_id, status);

CREATE INDEX idx_agent_runs_created_at
  ON public.agent_runs(created_at DESC);

CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_scope jsonb,
  assigned_agent_key_id uuid NOT NULL REFERENCES public.agent_keys(id) ON DELETE RESTRICT,
  task_type public.agent_task_type NOT NULL,
  status public.agent_task_status NOT NULL DEFAULT 'todo',
  depends_on uuid[] NOT NULL DEFAULT '{}'::uuid[],
  acceptance_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_tasks_run_status
  ON public.agent_tasks(run_id, status);

CREATE INDEX idx_agent_tasks_assignee_status
  ON public.agent_tasks(assigned_agent_key_id, status);

CREATE INDEX idx_agent_tasks_workspace_doc
  ON public.agent_tasks(workspace_id, document_id);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent_runs"
  ON public.agent_runs FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create agent_runs"
  ON public.agent_runs FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update agent_runs"
  ON public.agent_runs FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete agent_runs"
  ON public.agent_runs FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Members can view agent_tasks"
  ON public.agent_tasks FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create agent_tasks"
  ON public.agent_tasks FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update agent_tasks"
  ON public.agent_tasks FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete agent_tasks"
  ON public.agent_tasks FOR DELETE
  USING (public.is_workspace_admin(workspace_id));
