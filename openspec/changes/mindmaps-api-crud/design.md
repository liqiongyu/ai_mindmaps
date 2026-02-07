## Context

- We already have Supabase Auth wired in the app (`@supabase/ssr` + middleware session refresh).
- Database schema + RLS for `mindmaps` / `mindmap_nodes` is defined under `supabase/migrations/20260207000000_mindmap_storage.sql` and must be applied in the Supabase project.
- The editor currently operates on an in-memory `MindmapState` and applies changes via `Operation[]`.

## Goals / Non-Goals

**Goals:**

- Provide route handlers for creating, listing, loading, saving, and sharing mindmaps.
- Ensure endpoints require authentication where appropriate and fail safely.
- Define stable JSON shapes and validate request payloads with Zod.

**Non-Goals:**

- UI integration (list page, autosave, editor loading) is handled in a separate change.
- Chat/AI endpoints and ops application are handled in separate changes.

## Decisions

- **Auth in route handlers:** use `createSupabaseServerClient()` so Supabase queries include the user's session (cookie-based JWT) and RLS enforces ownership.
- **Mindmap creation:** generate `mindmapId` and `rootNodeId` server-side (UUID) and insert both `mindmaps` + root `mindmap_nodes` rows.
- **Saving strategy (MVP):** treat save as full replacement of node rows for a mindmap (delete all rows for `mindmap_id`, then insert the current node set). This is simple and deterministic for MVP.
- **Public load:** fetch by `public_slug` + `is_public=true` and rely on the public-read RLS policies for reads.

## Risks / Trade-offs

- **Delete+insert saves:** simple but not optimized for large mindmaps; acceptable for MVP and can be replaced with upsert+diff later.
- **Schema dependency:** APIs will return table-not-found errors until the SQL migration has been applied; mitigation is explicit docs and a sanity-check script.
