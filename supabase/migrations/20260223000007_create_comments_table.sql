create table public.comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.comment_threads(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create index idx_comments_thread on public.comments(thread_id);
create index idx_comments_document on public.comments(document_id);
create index idx_comments_author on public.comments(author_id);
