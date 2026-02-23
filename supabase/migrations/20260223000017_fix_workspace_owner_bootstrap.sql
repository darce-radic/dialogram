-- Fix: Allow workspace owners to add themselves as the first member.
-- The existing "Admins can insert members" policy requires the user
-- to already be in workspace_members, which is impossible when creating
-- a new workspace (chicken-and-egg problem).

create policy "Workspace owners can add members"
  on public.workspace_members for insert
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_members.workspace_id
        and w.owner_id = auth.uid()
    )
  );
