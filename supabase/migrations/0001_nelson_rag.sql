-- Nelson-GPT RAG schema

create extension if not exists "pgcrypto";
create extension if not exists vector;

create table if not exists public.nelson_textbook_chunks (
  id uuid primary key default gen_random_uuid(),
  book_title text not null,
  edition text,
  chapter_section text,
  content text not null,
  summary text,
  category text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists nelson_textbook_chunks_embedding_idx
  on public.nelson_textbook_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists nelson_textbook_chunks_book_title_idx
  on public.nelson_textbook_chunks (book_title);

create index if not exists nelson_textbook_chunks_metadata_gin_idx
  on public.nelson_textbook_chunks
  using gin (metadata);

alter table public.nelson_textbook_chunks enable row level security;

-- Server should use service_role key. Authenticated users can read chunks if needed.
create policy "nelson_textbook_chunks_select_authenticated"
  on public.nelson_textbook_chunks
  for select
  to authenticated
  using (true);

create or replace function public.match_nelson_textbook_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  book_title text,
  edition text,
  chapter_section text,
  summary text,
  category text,
  created_at timestamptz,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    c.id,
    c.content,
    c.metadata,
    c.book_title,
    c.edition,
    c.chapter_section,
    c.summary,
    c.category,
    c.created_at,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.nelson_textbook_chunks c
  where c.metadata @> filter
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id text not null,
  query text not null,
  response text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_history_session_id_created_at_idx
  on public.chat_history (session_id, created_at desc);

alter table public.chat_history enable row level security;

create policy "chat_history_insert_own"
  on public.chat_history
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "chat_history_select_own"
  on public.chat_history
  for select
  to authenticated
  using (user_id = auth.uid());
