## Context

- `POST /api/mindmaps/:id/save` currently performs:
  - update mindmap title
  - delete all `mindmap_nodes` rows
  - insert all rows back
- This sequence is not transactional across HTTP calls and can corrupt data if an insert fails after a delete.
- `mindmap_nodes.parent_id` has a self-referential FK; inserts must be parent-before-child unless constraints are deferred.

## Goals / Non-Goals

**Goals:**

- Save mindmap nodes atomically (all-or-nothing) to avoid partial/empty mindmaps.
- Keep authorization enforced (owner-only) via RLS and `auth.uid()` checks.
- Make inserts deterministic and FK-safe by ordering nodes parent-before-child.

**Non-Goals:**

- Schema redesign (e.g., removing self-FK or changing PK strategy).
- Fine-grained patch saves (diff-based updates). This remains full-state replacement for MVP.

## Decisions

- Add a Postgres function `public.mma_replace_mindmap_nodes(...)` called via Supabase RPC:
  - Validates `auth.uid()` and ownership by updating the `mindmaps` row under RLS
  - Deletes and inserts nodes within one transaction
  - Inserts nodes in the provided JSON array order, preserving parent-before-child
- Update the save route to prefer the RPC and fall back to the existing delete+insert if the function is missing (to ease rollout).
- Update `mindmapStateToNodeRows()` to output rows in a DFS order from the root, guaranteeing parent-before-child.

## Risks / Trade-offs

- [RPC not deployed yet] → Mitigation: fallback path keeps existing behavior.
- [Large mindmaps JSON payload size] → Mitigation: MVP scope keeps mindmaps modest; consider compression/diff saves later.
- [Unexpected FK failures] → Mitigation: deterministic DFS ordering + `WITH ORDINALITY` insert ordering in SQL.
