## Why

Mindmap list currently loads all items at once, and the canvas rebuild path can do unnecessary work for large graphs. As usage scales (many mindmaps per user, 500+ node maps), this causes slower page loads and less fluid interactions, especially for the public viewer.

## What Changes

- Add cursor-based pagination + search for mindmap listing:
  - `GET /api/mindmaps?cursor=&limit=&q=` -> `{ items, nextCursor, total }`
  - List UI supports search + “load more” with stable ordering
- Add query-friendly indexing for the list ordering to keep paging fast.
- Optimize `MindmapCanvas` to avoid expensive layout recomputation for selection/highlight/edit state changes, improving large-map interactivity and public page first paint.

## Capabilities

### New Capabilities

- `mindmaps-list-pagination`: Paginated + searchable mindmap list API and UI.
- `mindmap-canvas-performance`: Reduce unnecessary canvas recomputation for large graphs (editor + public viewer).

### Modified Capabilities

<!-- none -->

## Impact

- Backend: `src/app/api/mindmaps/route.ts`, (optional) new helper under `src/lib/mindmap/`
- Frontend: `src/app/mindmaps/page.tsx`, `src/app/mindmaps/MindmapsListClient.tsx`
- Canvas: `src/app/mindmaps/[mindmapId]/MindmapCanvas.tsx`
- Database: add index migration under `supabase/migrations/`
- Tests: unit tests for cursor encoding/decoding and canvas update-path invariants (where feasible)
