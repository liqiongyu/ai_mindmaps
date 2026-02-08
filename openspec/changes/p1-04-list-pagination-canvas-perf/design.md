## Context

- `/mindmaps` currently loads the full list of mindmaps (no pagination/search), which will not scale as the number of items grows.
- `MindmapCanvas` computes the D3 tree layout via `mindmapStateToFlow(state)` inside a memo that depends on view state (selection/edit/highlight), causing unnecessary recomputation for large graphs and impacting responsiveness. The public viewer reuses the same canvas, so it benefits from the same optimization.

## Goals / Non-Goals

**Goals:**

- Add cursor-based pagination + title search for mindmap listing via `GET /api/mindmaps`.
- Keep ordering stable (by `updated_at DESC, id DESC`) and expose `nextCursor`.
- Add a query-friendly DB index for the list ordering.
- Refactor `MindmapCanvas` to compute layout only when structural state changes, not when view state changes.

**Non-Goals:**

- Full-text search infrastructure (Postgres FTS / trigram) beyond simple title matching.
- Pagination for public-page node snapshot payloads (future work if needed).
- Benchmark harnesses in CI (we’ll rely on structural code changes + unit tests).

## Decisions

1. **Keyset pagination via composite cursor**
   - Cursor encodes `{ updatedAt, id }` as base64url JSON.
   - Query filters with `(updated_at < cursor.updatedAt) OR (updated_at = cursor.updatedAt AND id < cursor.id)` and orders by `updated_at DESC, id DESC`.
   - This avoids offset pagination drawbacks (slow for deep pages, unstable when items update).

2. **Always return `total`**
   - API returns `total` using Supabase `count: "exact"` on the filtered query.
   - Keeps UI simple (`已加载第 {page} 页，共 {total} 条。`).

3. **List UI uses client-side incremental fetch**
   - Server page renders the first page (fast) and passes `items/nextCursor/total/q` to the client.
   - Client supports debounced search and “load more”.

4. **Canvas layout computation decoupled from view state**
   - Compute `mindmapStateToFlow` only from `state` + `collapsedNodeIds`.
   - Apply selection/highlight/editability as lightweight updates to ReactFlow nodes without triggering layout recomputation.

## Risks / Trade-offs

- [Risk] Exact counts add latency on very large lists → Mitigation: keep `limit` small (default 20) and allow future switch to approximate counts if needed.
- [Risk] Cursor filter string syntax for PostgREST `.or(...)` is easy to get wrong → Mitigation: unit-test cursor encode/decode and keep the filter format centralized.
- [Risk] Canvas refactor could introduce subtle selection/dragging regressions → Mitigation: keep behavior identical, add targeted unit tests where feasible, and avoid changing layout algorithm.

## Migration Plan

- Deploy DB index migration first (safe, non-breaking).
- Deploy API + UI changes together.
- Rollback: revert API/UI to full list; index can remain safely.

## Open Questions

- Should we add optional trigram index for better `%q%` search performance once titles scale? (Not required for this iteration.)
