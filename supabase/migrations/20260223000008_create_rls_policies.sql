-- ============================
-- USERS
-- ============================

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- ============================
-- WORKSPACES
-- ============================

create policy "Members can view workspace"
  on public.workspaces for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create workspace"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

create policy "Admins can update workspace"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "Owners can delete workspace"
  on public.workspaces for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = workspaces.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ============================
-- WORKSPACE MEMBERS
-- ============================

create policy "Members can view workspace members"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Admins can insert members"
  on public.workspace_members for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

create policy "Admins can update members"
  on public.workspace_members for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

create policy "Admins can delete members"
  on public.workspace_members for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- ============================
-- FOLDERS
-- ============================

create policy "Members can view folders"
  on public.folders for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.workspace_members
      where workspace_id = folders.workspace_id
        and user_id = auth.uid()
    )
  );

create policy "Members can create folders"
  on public.folders for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = folders.workspace_id
        and user_id = auth.uid()
    )
  );

create policy "Members can update folders"
  on public.folders for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = folders.workspace_id
        and user_id = auth.uid()
    )
  );

create policy "Admins can delete folders"
  on public.folders for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = folders.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================
-- DOCUMENTS
-- ============================

create policy "Members can view documents"
  on public.documents for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.workspace_members
      where workspace_id = documents.workspace_id
        and user_id = auth.uid()
    )
  );

create policy "Members can create documents"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = documents.workspace_id
        and user_id = auth.uid()
    )
  );

create policy "Members can update documents"
  on public.documents for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = documents.workspace_id
        and user_id = auth.uid()
    )
  );

create policy "Admins can delete documents"
  on public.documents for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = documents.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================
-- COMMENT THREADS
-- ============================

create policy "Members can view threads"
  on public.comment_threads for select
  using (
    exists (
      select 1 from public.documents d
      join public.workspace_members wm on wm.workspace_id = d.workspace_id
      where d.id = comment_threads.document_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Members can create threads"
  on public.comment_threads for insert
  with check (
    exists (
      select 1 from public.documents d
      join public.workspace_members wm on wm.workspace_id = d.workspace_id
      where d.id = comment_threads.document_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Thread creators can update threads"
  on public.comment_threads for update
  using (auth.uid() = created_by);

-- ============================
-- COMMENTS
-- ============================

create policy "Members can view comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.documents d
      join public.workspace_members wm on wm.workspace_id = d.workspace_id
      where d.id = comments.document_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Members can create comments"
  on public.comments for insert
  with check (
    exists (
      select 1 from public.documents d
      join public.workspace_members wm on wm.workspace_id = d.workspace_id
      where d.id = comments.document_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Authors can update own comments"
  on public.comments for update
  using (auth.uid() = author_id);

create policy "Authors can delete own comments"
  on public.comments for delete
  using (auth.uid() = author_id);
