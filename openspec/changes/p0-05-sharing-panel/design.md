## Data semantics

- Public (unlisted): `mindmaps.is_public = true` AND `mindmaps.public_slug` is non-null.
- Stop sharing: `mindmaps.is_public = false` AND `mindmaps.public_slug = null`.

## API surface (P0)

- `POST /api/mindmaps/:id/share`
  - Enables sharing and (re)generates a new slug (refresh link).
  - Returns `{ ok: true, publicSlug }`.
- `DELETE /api/mindmaps/:id/share`
  - Stops sharing and clears the slug.
  - Returns `{ ok: true }`.

## Editor UI

Render a small panel/strip in the editor showing:

- Share status label (private/public)
- Link (when public)
- Actions:
  - `生成链接` (when private)
  - `刷新链接` (when public)
  - `复制链接` (when public)
  - `停止分享` (when public, with confirm)
- Hint copy:
  - `公开页不会展示聊天记录与 AI ops。`

## Loading initial status

Extend `/api/mindmaps/:id` response to include `isPublic` and `publicSlug` so the editor can render the current status immediately after load.
