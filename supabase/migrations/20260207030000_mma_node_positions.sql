-- MindMaps AI (MMA) - Persisted node positions (x/y) + incremental position updates
--
-- Apply this in: Supabase Dashboard -> SQL Editor
--
-- Notes:
-- - Positions are optional (nullable) for backward compatibility.
-- - `mma_replace_mindmap_nodes` preserves existing positions when replacing nodes.

begin;

alter table public.mindmap_nodes
add column if not exists pos_x double precision,
add column if not exists pos_y double precision;

create or replace function public.mma_update_mindmap_node_positions(
  p_mindmap_id uuid,
  p_positions jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.mindmaps m
    where m.id = p_mindmap_id and m.owner_id = auth.uid()
  ) then
    raise exception 'Mindmap not found';
  end if;

  with parsed as (
    select r.*
    from jsonb_array_elements(p_positions) as e(value)
    cross join lateral jsonb_to_record(e.value) as r(
      id uuid,
      pos_x double precision,
      pos_y double precision
    )
  )
  select count(*) into v_count
  from parsed;

  if v_count = 0 then
    return;
  end if;

  if exists (
    with parsed as (
      select r.*
      from jsonb_array_elements(p_positions) as e(value)
      cross join lateral jsonb_to_record(e.value) as r(
        id uuid,
        pos_x double precision,
        pos_y double precision
      )
    )
    select 1
    from parsed
    where id is null or pos_x is null or pos_y is null
  ) then
    raise exception 'Invalid positions payload';
  end if;

  with parsed as (
    select r.*
    from jsonb_array_elements(p_positions) as e(value)
    cross join lateral jsonb_to_record(e.value) as r(
      id uuid,
      pos_x double precision,
      pos_y double precision
    )
  )
  update public.mindmap_nodes n
  set pos_x = p.pos_x,
      pos_y = p.pos_y
  from parsed p
  where n.mindmap_id = p_mindmap_id
    and n.id = p.id;

  get diagnostics v_updated = row_count;

  -- Keep mindmaps.updated_at in sync so list sorting and public headers reflect edits.
  update public.mindmaps
  set updated_at = now()
  where id = p_mindmap_id and owner_id = auth.uid();

  if v_updated <> v_count then
    raise exception 'Some nodes not found for mindmap';
  end if;
end;
$$;

grant execute on function public.mma_update_mindmap_node_positions(uuid, jsonb) to authenticated;

create or replace function public.mma_replace_mindmap_nodes(
  p_mindmap_id uuid,
  p_root_node_id uuid,
  p_title text,
  p_nodes jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  update public.mindmaps
  set title = coalesce(nullif(trim(p_title), ''), title)
  where id = p_mindmap_id
    and owner_id = auth.uid()
    and root_node_id = p_root_node_id;

  if not found then
    raise exception 'Mindmap not found';
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
end;
$$;

grant execute on function public.mma_replace_mindmap_nodes(uuid, uuid, text, jsonb) to authenticated;

commit;
