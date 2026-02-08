-- MindMaps AI (MMA) - Optimistic concurrency control for persisted saves
--
-- Adds mindmaps.version and updates the atomic save RPC to detect conflicts.

begin;

alter table public.mindmaps
add column if not exists version bigint;

update public.mindmaps
set version = 1
where version is null;

alter table public.mindmaps
alter column version set default 1,
alter column version set not null;

drop function if exists public.mma_replace_mindmap_nodes(uuid, uuid, text, jsonb);

create or replace function public.mma_replace_mindmap_nodes(
  p_mindmap_id uuid,
  p_root_node_id uuid,
  p_title text,
  p_nodes jsonb,
  p_base_version bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_version bigint;
  current_version bigint;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    with parsed as (
      select r.*
      from jsonb_array_elements(p_nodes) as e(value)
      cross join lateral jsonb_to_record(e.value) as r(
        id uuid,
        parent_id uuid,
        text text,
        notes text,
        order_index integer
      )
    )
    select 1
    from parsed
    where id = p_root_node_id and parent_id is null
  ) then
    raise exception 'Root node missing or invalid';
  end if;

  if exists (
    with parsed as (
      select r.*
      from jsonb_array_elements(p_nodes) as e(value)
      cross join lateral jsonb_to_record(e.value) as r(
        id uuid,
        parent_id uuid,
        text text,
        notes text,
        order_index integer
      )
    )
    select 1
    from parsed p
    where p.parent_id is not null
      and not exists (select 1 from parsed parent where parent.id = p.parent_id)
  ) then
    raise exception 'Invalid parent_id in nodes payload';
  end if;

  update public.mindmaps
  set title = coalesce(nullif(trim(p_title), ''), title),
      version = version + 1
  where id = p_mindmap_id
    and owner_id = auth.uid()
    and root_node_id = p_root_node_id
    and version = p_base_version
  returning version into next_version;

  if not found then
    select m.version
    into current_version
    from public.mindmaps m
    where m.id = p_mindmap_id
      and m.owner_id = auth.uid()
      and m.root_node_id = p_root_node_id;

    if current_version is null then
      raise exception 'Mindmap not found';
    end if;

    return jsonb_build_object('ok', false, 'code', 'VERSION_CONFLICT', 'version', current_version);
  end if;

  with previous_positions as (
    delete from public.mindmap_nodes
    where mindmap_id = p_mindmap_id
    returning id, pos_x, pos_y
  ),
  parsed as (
    select r.*, e.idx
    from jsonb_array_elements(p_nodes) with ordinality as e(value, idx)
    cross join lateral jsonb_to_record(e.value) as r(
      id uuid,
      parent_id uuid,
      text text,
      notes text,
      order_index integer,
      pos_x double precision,
      pos_y double precision
    )
  )
  insert into public.mindmap_nodes (id, mindmap_id, parent_id, text, notes, order_index, pos_x, pos_y)
  select
    p.id,
    p_mindmap_id,
    p.parent_id,
    p.text,
    p.notes,
    p.order_index,
    coalesce(p.pos_x, prev.pos_x),
    coalesce(p.pos_y, prev.pos_y)
  from parsed p
  left join previous_positions prev on prev.id = p.id
  order by p.idx;

  return jsonb_build_object('ok', true, 'version', next_version);
end;
$$;

grant execute on function public.mma_replace_mindmap_nodes(uuid, uuid, text, jsonb, bigint) to authenticated;

commit;
