create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Untitled',
  content jsonb,
  position integer not null default 0,
  created_by uuid not null references public.users(id),
  last_edited_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.documents enable row level security;

create index idx_documents_workspace on public.documents(workspace_id);
create index idx_documents_folder on public.documents(folder_id);
create index idx_documents_created_by on public.documents(created_by);
