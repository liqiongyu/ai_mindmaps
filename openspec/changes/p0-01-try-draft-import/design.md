## UX Flow

### Entry

- `/` primary CTA routes to `/try` (already in place).
- Try banner login/signup links include `next=/try`.

### After auth on `/try`

If `mma:try:draft:v1` exists and user is authenticated, show a decision modal:

- Import (recommended)
- Start blank
- Discard draft

### Outcomes

- Import:
  - Call `POST /api/mindmaps/import-try` with `{ draft, ui, source: "try" }`
  - On success: clear local draft and route to `/mindmaps/:id`
- Start blank:
  - Clear local draft and create a new empty mindmap via `POST /api/mindmaps`
  - Route to `/mindmaps/:id`
- Discard:
  - Clear local draft and route to `/mindmaps`

## Backend Design

### API

`POST /api/mindmaps/import-try`

- Requires authentication
- Validates request body and draft shape
- Remaps IDs to UUIDs to satisfy the DB schema
- Creates a new `mindmaps` row
- Uses `mma_replace_mindmap_nodes` RPC to persist the whole node set atomically
- Best-effort persist of UI state (if the table exists)

### ID remapping

Try-mode draft may contain non-UUID node IDs (e.g. the sample seed). Import MUST:

- Generate a UUID for each node id
- Rewrite `rootNodeId`, all `nodesById` keys, and each node's `id`/`parentId`
- Preserve structure, titles/notes, and sibling ordering (`orderIndex`)
- Optionally map `ui.selectedNodeId` and `ui.collapsedNodeIds`

## Edge cases

- Draft JSON missing or invalid: do not show modal; continue in try mode.
- Authenticated user but draft is empty/invalid: show an error and offer to discard.
- Import API failures: show a recoverable error in the modal, keep local draft intact.
