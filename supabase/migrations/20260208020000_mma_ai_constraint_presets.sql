-- MindMaps AI (MMA) - AI constraint presets (P1-01)

begin;

create table if not exists public.ai_constraint_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_constraint_presets_owner_id_name_idx
on public.ai_constraint_presets (owner_id, name);

drop trigger if exists set_ai_constraint_presets_updated_at on public.ai_constraint_presets;
create trigger set_ai_constraint_presets_updated_at
before update on public.ai_constraint_presets
for each row execute function public.set_updated_at();

alter table public.ai_constraint_presets enable row level security;

drop policy if exists "AI constraint presets: owner can read" on public.ai_constraint_presets;
create policy "AI constraint presets: owner can read"
on public.ai_constraint_presets
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "AI constraint presets: owner can insert" on public.ai_constraint_presets;
create policy "AI constraint presets: owner can insert"
on public.ai_constraint_presets
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "AI constraint presets: owner can update" on public.ai_constraint_presets;
create policy "AI constraint presets: owner can update"
on public.ai_constraint_presets
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "AI constraint presets: owner can delete" on public.ai_constraint_presets;
create policy "AI constraint presets: owner can delete"
on public.ai_constraint_presets
for delete
to authenticated
using (owner_id = auth.uid());

commit;
