create type public.thread_type as enum ('inline', 'document');

create table public.comment_threads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  thread_type public.thread_type not null default 'document',
  inline_ref jsonb,
  resolved boolean not null default false,
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comment_threads enable row level security;

create index idx_comment_threads_document on public.comment_threads(document_id);
