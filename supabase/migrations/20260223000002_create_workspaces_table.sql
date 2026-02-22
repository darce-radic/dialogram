create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  owner_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.workspaces enable row level security;

create index idx_workspaces_owner on public.workspaces(owner_id);
create index idx_workspaces_slug on public.workspaces(slug);
