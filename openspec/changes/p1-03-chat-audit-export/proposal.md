## Why

While the sidebar already supports viewing/copying ops and rolling back, users still can’t easily export a complete session audit record for review, debugging, or compliance. A first-class JSON export enables reliable post-mortems and sharing with teammates without exposing the full mindmap or internal tables.

## What Changes

- Add `GET /api/ai/chat/export` to export the current chat thread (by `mindmapId` + `scope` + optional `selectedNodeId`) as a JSON payload containing:
  - thread metadata (scope, nodeId, createdAt)
  - messages (role, content, operations, provider, model, createdAt)
- Add an “Export audit JSON” action in the AI sidebar for the active thread.
- Keep export access owner-scoped (requires auth + mindmap ownership check).

## Capabilities

### New Capabilities

- `ai-chat-audit-export`: Export chat thread audit JSON for a mindmap/scope.

### Modified Capabilities

<!-- none -->

## Impact

- Backend: new route `src/app/api/ai/chat/export/route.ts`
- Frontend: `src/app/mindmaps/[mindmapId]/MindmapChatSidebar.tsx` (download action)
- Tests: add unit tests for export request schema / payload formatting helpers
