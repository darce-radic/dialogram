-- ============================
-- AGENT KEYS
-- ============================

create type public.agent_role as enum ('reader', 'commenter', 'editor');

create table public.agent_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  role public.agent_role not null default 'reader',
  permissions jsonb not null default '{}',
  created_by uuid not null references public.users(id),
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agent_keys_workspace on public.agent_keys(workspace_id);
create index idx_agent_keys_key_hash on public.agent_keys(key_hash);

alter table public.agent_keys enable row level security;

-- Members can view agent keys in their workspace
create policy "Members can view agent keys"
  on public.agent_keys for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = agent_keys.workspace_id
        and user_id = auth.uid()
    )
  );

-- Admins/owners can create agent keys
create policy "Admins can create agent keys"
  on public.agent_keys for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = agent_keys.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Admins/owners can update agent keys
create policy "Admins can update agent keys"
  on public.agent_keys for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = agent_keys.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Admins/owners can delete agent keys
create policy "Admins can delete agent keys"
  on public.agent_keys for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = agent_keys.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
