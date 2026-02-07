-- MindMaps AI (MMA) - Mindmap UI state persistence (collapsed/selected/viewport)

begin;

create table if not exists public.mindmap_ui_state (
  mindmap_id uuid primary key references public.mindmaps (id) on delete cascade,
  collapsed_node_ids text[] not null default '{}'::text[],
  selected_node_id uuid,
  viewport jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_mindmap_ui_state_updated_at on public.mindmap_ui_state;
create trigger set_mindmap_ui_state_updated_at
before update on public.mindmap_ui_state
for each row execute function public.set_updated_at();

alter table public.mindmap_ui_state enable row level security;

drop policy if exists "Mindmap UI state: owner can read" on public.mindmap_ui_state;
create policy "Mindmap UI state: owner can read"
on public.mindmap_ui_state
for select
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Mindmap UI state: owner can insert" on public.mindmap_ui_state;
create policy "Mindmap UI state: owner can insert"
on public.mindmap_ui_state
for insert
to authenticated
with check (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

drop policy if exists "Mindmap UI state: owner can update" on public.mindmap_ui_state;
create policy "Mindmap UI state: owner can update"
on public.mindmap_ui_state
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

drop policy if exists "Mindmap UI state: owner can delete" on public.mindmap_ui_state;
create policy "Mindmap UI state: owner can delete"
on public.mindmap_ui_state
for delete
to authenticated
using (
  exists (
    select 1
    from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

commit;
