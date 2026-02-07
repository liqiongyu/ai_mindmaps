-- MindMaps AI (MMA) - Mindmap storage schema (mindmaps + nodes) with RLS
--
-- Apply this in: Supabase Dashboard -> SQL Editor
--
-- Notes:
-- - `mindmaps.root_node_id` is stored for the app, but is not enforced as an FK to avoid insert cycles.
-- - Public reads are gated by `mindmaps.is_public = true` (future work will expose share pages via slug).

begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  root_node_id uuid not null,
  is_public boolean not null default false,
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mindmaps_owner_id_idx on public.mindmaps (owner_id);

drop trigger if exists set_mindmaps_updated_at on public.mindmaps;
create trigger set_mindmaps_updated_at
before update on public.mindmaps
for each row execute function public.set_updated_at();

create table if not exists public.mindmap_nodes (
  id uuid primary key default gen_random_uuid(),
  mindmap_id uuid not null references public.mindmaps (id) on delete cascade,
  parent_id uuid references public.mindmap_nodes (id) on delete cascade,
  text text not null,
  notes text,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mindmap_nodes_mindmap_id_idx on public.mindmap_nodes (mindmap_id);
create index if not exists mindmap_nodes_parent_id_idx on public.mindmap_nodes (parent_id);
create index if not exists mindmap_nodes_tree_order_idx
on public.mindmap_nodes (mindmap_id, parent_id, order_index);

drop trigger if exists set_mindmap_nodes_updated_at on public.mindmap_nodes;
create trigger set_mindmap_nodes_updated_at
before update on public.mindmap_nodes
for each row execute function public.set_updated_at();

alter table public.mindmaps enable row level security;
alter table public.mindmap_nodes enable row level security;

drop policy if exists "Mindmaps: owner can read" on public.mindmaps;
create policy "Mindmaps: owner can read"
on public.mindmaps
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Mindmaps: owner can insert" on public.mindmaps;
create policy "Mindmaps: owner can insert"
on public.mindmaps
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Mindmaps: owner can update" on public.mindmaps;
create policy "Mindmaps: owner can update"
on public.mindmaps
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Mindmaps: owner can delete" on public.mindmaps;
create policy "Mindmaps: owner can delete"
on public.mindmaps
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Mindmaps: public can read public mindmaps" on public.mindmaps;
create policy "Mindmaps: public can read public mindmaps"
on public.mindmaps
for select
using (is_public = true);

drop policy if exists "Mindmap nodes: owner can read" on public.mindmap_nodes;
create policy "Mindmap nodes: owner can read"
on public.mindmap_nodes
for select
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Mindmap nodes: owner can insert" on public.mindmap_nodes;
create policy "Mindmap nodes: owner can insert"
on public.mindmap_nodes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Mindmap nodes: owner can update" on public.mindmap_nodes;
create policy "Mindmap nodes: owner can update"
on public.mindmap_nodes
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

drop policy if exists "Mindmap nodes: owner can delete" on public.mindmap_nodes;
create policy "Mindmap nodes: owner can delete"
on public.mindmap_nodes
for delete
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Mindmap nodes: public can read public mindmap nodes" on public.mindmap_nodes;
create policy "Mindmap nodes: public can read public mindmap nodes"
on public.mindmap_nodes
for select
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.is_public = true
  )
);

commit;
