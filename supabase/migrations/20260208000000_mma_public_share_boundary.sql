-- MindMaps AI (MMA) - Tighten public sharing data boundary (slug-controlled read)
--
-- Notes:
-- - Public sharing is "unlisted": only readable by `public_slug`, not enumerable.
-- - This migration removes anon table reads and replaces them with a SECURITY DEFINER RPC.

begin;

-- Remove public SELECT policies that allow anonymous enumeration.
drop policy if exists "Mindmaps: public can read public mindmaps" on public.mindmaps;
drop policy if exists "Mindmap nodes: public can read public mindmap nodes" on public.mindmap_nodes;

-- Controlled public snapshot read (by slug only).
create or replace function public.mma_get_public_mindmap_snapshot(p_slug text)
returns table (
  mindmap_id uuid,
  title text,
  root_node_id uuid,
  updated_at timestamptz,
  nodes jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    m.id as mindmap_id,
    m.title,
    m.root_node_id,
    m.updated_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', n.id,
            'parent_id', n.parent_id,
            'text', n.text,
            'notes', n.notes,
            'order_index', n.order_index,
            'pos_x', n.pos_x,
            'pos_y', n.pos_y
          )
          order by n.order_index
        )
        from public.mindmap_nodes n
        where n.mindmap_id = m.id
      ),
      '[]'::jsonb
    ) as nodes
  from public.mindmaps m
  where m.is_public = true
    and m.public_slug = p_slug
  limit 1;
$$;

grant execute on function public.mma_get_public_mindmap_snapshot(text) to anon, authenticated;

commit;

