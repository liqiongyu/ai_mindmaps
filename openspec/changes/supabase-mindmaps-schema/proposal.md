## Why

MVP requires mindmaps to be persisted in Supabase so users can create a mindmap, edit it, and reload it later. Today we have auth and an in-memory demo editor, but no database schema or access-control rules to store mindmaps safely.

## What Changes

- Add SQL migrations that create `mindmaps` and `mindmap_nodes` tables for storing a mindmap tree.
- Enable RLS and add policies so:
  - authenticated users can CRUD their own mindmaps/nodes
  - anonymous users can read public mindmaps/nodes (for future sharing)
- Add developer docs for applying the SQL in the Supabase dashboard (no Supabase CLI workflow in repo yet).

## Capabilities

### New Capabilities

- `mindmap-storage`: Supabase schema + RLS policies for persisting mindmaps and their nodes.

### Modified Capabilities

- (none)

## Impact

- New files under `supabase/migrations/` and `docs/` to define and apply the schema.
- Supabase project must run these migrations before any persistence/API work can function (otherwise table-not-found errors).
