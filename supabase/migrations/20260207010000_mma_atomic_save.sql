-- MindMaps AI (MMA) - Atomic save RPC for mindmap nodes
--
-- Apply this in: Supabase Dashboard -> SQL Editor
--
-- Notes:
-- - This replaces the mindmap's nodes as an all-or-nothing operation.
-- - Inserts are ordered (via WITH ORDINALITY) to keep parent-before-child insertion reliable.

begin;

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

  delete from public.mindmap_nodes where mindmap_id = p_mindmap_id;

  insert into public.mindmap_nodes (id, mindmap_id, parent_id, text, notes, order_index)
  select r.id, p_mindmap_id, r.parent_id, r.text, r.notes, r.order_index
  from jsonb_array_elements(p_nodes) with ordinality as e(value, idx)
  cross join lateral jsonb_to_record(e.value) as r(
    id uuid,
    parent_id uuid,
    text text,
    notes text,
    order_index integer
  )
  order by e.idx;
end;
$$;

grant execute on function public.mma_replace_mindmap_nodes(uuid, uuid, text, jsonb) to authenticated;

commit;

