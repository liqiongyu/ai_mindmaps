## Telemetry Events (P0-06)

### Client → Server ingestion

`POST /api/telemetry/events`

```json
{
  "sessionId": "string",
  "events": [{ "name": "landing_cta_click", "createdAt?": "ISO", "properties?": {} }]
}
```

Response:

```json
{ "ok": true }
```

### Event names (initial)

- `landing_cta_click`
- `try_opened`
- `editor_opened`
- `node_added`
- `ai_request_sent`
- `ai_ops_applied`
- `mindmap_saved`
- `export_succeeded`
- `share_link_generated`
