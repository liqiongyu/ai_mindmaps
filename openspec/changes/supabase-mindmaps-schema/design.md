## Context

- The app uses Supabase Auth for sessions and `@supabase/ssr` for cookie-based auth in Server Components and middleware.
- We currently have an in-memory mindmap editor (`MindmapState` + `Operation[]`) but no persistence layer.
- The repo does not yet include a Supabase CLI workflow or migrations directory; we will introduce SQL migrations that can be applied via the Supabase dashboard SQL editor.

## Goals / Non-Goals

**Goals:**

- Define a minimal Postgres schema for persisting mindmaps and nodes (tree structure + sibling ordering).
- Add RLS policies to enforce owner-only access for private data.
- Allow anonymous read access for public mindmaps/nodes to support the upcoming “share read-only page” milestone.
- Provide a clear, repeatable SQL entrypoint for provisioning the schema in a Supabase project.

**Non-Goals:**

- Implement mindmap CRUD API endpoints (handled in a separate change).
- Implement UI integration (load/save/autosave) in the editor (handled in a separate change).
- Implement share-link generation UX (handled in a separate change).

## Decisions

- **Tree representation:** store nodes as an adjacency list (`mindmap_nodes.parent_id`) with sibling ordering (`order_index`).
- **Root identification:** keep `mindmaps.root_node_id` so the client can reconstruct `MindmapState.rootNodeId` without inferring root via query rules.
- **Public sharing fields:** add `is_public` + `public_slug` to `mindmaps`. Public read access is gated by `is_public = true` (slug is used at the API layer for lookup, not as the RLS predicate).
- **RLS enforcement:** rely on `auth.uid()` for ownership checks; for nodes, use `EXISTS` queries against `mindmaps` to ensure the node’s mindmap is owned by the current user (writes) or is public (reads).
- **Timestamps:** add `created_at` / `updated_at` plus a shared trigger to keep `updated_at` current on updates.

## Risks / Trade-offs

- **Manual provisioning:** without Supabase CLI credentials in repo, applying migrations is a manual step (dashboard SQL editor). Mitigation: keep a single, well-documented migration file and reference it from docs.
- **Root integrity:** FK constraints cannot fully guarantee `root_node_id` belongs to the same `mindmap_id` without extra triggers. Mitigation: enforce in application code when creating/loading mindmaps.
- **Public enumeration:** a policy like `is_public = true` allows listing all public mindmaps. Mitigation: acceptable for MVP; can later tighten policies (e.g., move public reads behind a security-definer RPC that only returns by slug).
