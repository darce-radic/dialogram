-- Fix infinite recursion in RLS policies.
-- The workspace_members SELECT policy referenced workspace_members itself,
-- causing infinite recursion when triggered through cross-table policy chains
-- (e.g., workspaces SELECT → workspace_members SELECT → workspace_members SELECT → ...)
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS for membership checks.

-- ============================
-- Helper functions (bypass RLS)
-- ============================

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- ============================
-- Drop ALL existing policies that cause recursion
-- ============================

-- Workspaces
DROP POLICY IF EXISTS "Members can view workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Admins can update workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete workspace" ON public.workspaces;

-- Workspace members
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.workspace_members;

-- Folders
DROP POLICY IF EXISTS "Members can view folders" ON public.folders;
DROP POLICY IF EXISTS "Members can create folders" ON public.folders;
DROP POLICY IF EXISTS "Members can update folders" ON public.folders;
DROP POLICY IF EXISTS "Admins can delete folders" ON public.folders;

-- Documents
DROP POLICY IF EXISTS "Members can view documents" ON public.documents;
DROP POLICY IF EXISTS "Members can create documents" ON public.documents;
DROP POLICY IF EXISTS "Members can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

-- Comment threads
DROP POLICY IF EXISTS "Members can view threads" ON public.comment_threads;
DROP POLICY IF EXISTS "Members can create threads" ON public.comment_threads;

-- Comments
DROP POLICY IF EXISTS "Members can view comments" ON public.comments;
DROP POLICY IF EXISTS "Members can create comments" ON public.comments;

-- ============================
-- Recreate policies using helper functions
-- ============================

-- WORKSPACES
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (deleted_at IS NULL AND public.is_workspace_member(id));

CREATE POLICY "Admins can update workspace"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_admin(id));

CREATE POLICY "Owners can delete workspace"
  ON public.workspaces FOR DELETE
  USING (public.is_workspace_owner(id));

-- WORKSPACE MEMBERS
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can insert members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Workspace owners can add members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- FOLDERS
CREATE POLICY "Members can view folders"
  ON public.folders FOR SELECT
  USING (deleted_at IS NULL AND public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update folders"
  ON public.folders FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete folders"
  ON public.folders FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- DOCUMENTS
CREATE POLICY "Members can view documents"
  ON public.documents FOR SELECT
  USING (deleted_at IS NULL AND public.is_workspace_member(workspace_id));

CREATE POLICY "Members can create documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update documents"
  ON public.documents FOR UPDATE
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- COMMENT THREADS (via document's workspace)
CREATE POLICY "Members can view threads"
  ON public.comment_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comment_threads.document_id
        AND public.is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY "Members can create threads"
  ON public.comment_threads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comment_threads.document_id
        AND public.is_workspace_member(d.workspace_id)
    )
  );

-- COMMENTS (via document's workspace)
CREATE POLICY "Members can view comments"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comments.document_id
        AND public.is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY "Members can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = comments.document_id
        AND public.is_workspace_member(d.workspace_id)
    )
  );
