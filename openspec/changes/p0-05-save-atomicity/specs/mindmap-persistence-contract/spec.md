## API: Mindmap persistence contract (P0-05)

### `POST /api/mindmaps/:mindmapId/save`

#### Request

```json
{ "title?": "string", "state": "MindmapState" }
```

#### Success

```json
{ "ok": true }
```

#### Failure (examples)

```json
{
  "ok": false,
  "code": "PERSISTENCE_UNAVAILABLE",
  "message": "Atomic save RPC is missing. Apply Supabase migrations first."
}
```

```json
{ "ok": false, "code": "SAVE_FAILED", "message": "Failed to save mindmap nodes" }
```

### `GET /api/mindmaps/:mindmapId`

#### Success

```json
{
  "ok": true,
  "mindmap": { "id": "uuid", "title": "string", "rootNodeId": "uuid", "updatedAt": "string", "isPublic": true, "publicSlug": "string|null" },
  "state": "MindmapState",
  "ui": { "collapsedNodeIds": ["uuid"], "selectedNodeId": "uuid|null", "viewport": "object|null" } | null,
  "persistence": { "chat": true, "uiState": true }
}
```

### `POST /api/ai/chat`

#### Success

```json
{
  "ok": true,
  "assistant_message": "string",
  "operations": "Operation[]",
  "provider?": "string|null",
  "model?": "string|null",
  "persistence?": { "chatPersisted": true }
}
```
