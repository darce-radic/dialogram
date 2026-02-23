-- Fix: Allow workspace owners to see their workspace immediately after creation.
-- The SELECT policy requires workspace membership, but when creating a new workspace
-- the owner member row hasn't been inserted yet. Allow owners to see via owner_id.

DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;

CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      public.is_workspace_member(id)
      OR owner_id = auth.uid()
    )
  );
