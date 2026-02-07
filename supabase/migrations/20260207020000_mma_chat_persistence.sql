-- MindMaps AI (MMA) - Chat threads/messages persistence for auditability
--
-- Apply this in: Supabase Dashboard -> SQL Editor
--
-- Notes:
-- - Chat data is owner-only (no public access), even for public mindmaps.
-- - The API can fall back gracefully if this migration has not been applied yet.

begin;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  mindmap_id uuid not null references public.mindmaps (id) on delete cascade,
  scope text not null check (scope in ('global', 'node')),
  node_id uuid,
  created_at timestamptz not null default now(),
  constraint chat_threads_scope_node_check check (
    (scope = 'global' and node_id is null) or (scope = 'node' and node_id is not null)
  )
);

create index if not exists chat_threads_mindmap_id_idx on public.chat_threads (mindmap_id);
create index if not exists chat_threads_scope_idx on public.chat_threads (scope);

-- Enforce one global thread per mindmap and one node thread per mindmap+node.
create unique index if not exists chat_threads_unique_global_idx
on public.chat_threads (mindmap_id)
where scope = 'global';

create unique index if not exists chat_threads_unique_node_idx
on public.chat_threads (mindmap_id, node_id)
where scope = 'node';

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  operations jsonb,
  provider text,
  model text,
  created_at timestamptz not null default now(),
  constraint chat_messages_ops_role_check check (
    (role = 'assistant' and operations is not null) or (role <> 'assistant' and operations is null)
  )
);

create index if not exists chat_messages_thread_created_idx
on public.chat_messages (thread_id, created_at);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Chat threads: owner can read" on public.chat_threads;
create policy "Chat threads: owner can read"
on public.chat_threads
for select
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat threads: owner can insert" on public.chat_threads;
create policy "Chat threads: owner can insert"
on public.chat_threads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat threads: owner can update" on public.chat_threads;
create policy "Chat threads: owner can update"
on public.chat_threads
for update
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat threads: owner can delete" on public.chat_threads;
create policy "Chat threads: owner can delete"
on public.chat_threads
for delete
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat messages: owner can read" on public.chat_messages;
create policy "Chat messages: owner can read"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_threads t
    join public.mindmaps m on m.id = t.mindmap_id
    where t.id = thread_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat messages: owner can insert" on public.chat_messages;
create policy "Chat messages: owner can insert"
on public.chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.chat_threads t
    join public.mindmaps m on m.id = t.mindmap_id
    where t.id = thread_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat messages: owner can update" on public.chat_messages;
create policy "Chat messages: owner can update"
on public.chat_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.chat_threads t
    join public.mindmaps m on m.id = t.mindmap_id
    where t.id = thread_id and m.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chat_threads t
    join public.mindmaps m on m.id = t.mindmap_id
    where t.id = thread_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Chat messages: owner can delete" on public.chat_messages;
create policy "Chat messages: owner can delete"
on public.chat_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.chat_threads t
    join public.mindmaps m on m.id = t.mindmap_id
    where t.id = thread_id and m.owner_id = auth.uid()
  )
);

commit;
