## Why

MVP requires users to modify mindmaps via AI, with changes represented as validated, auditable `operations[]` (ops) rather than replacing the whole tree. Today `/api/ai/chat` is a placeholder.

## What Changes

- Implement `POST /api/ai/chat` that:
  - loads the current mindmap state
  - calls Azure OpenAI (`gpt-5-mini`) server-side
  - parses and validates a strict `{ assistant_message, operations[] }` JSON output
  - enforces scope rules (global vs. node-scoped)
- Add shared utilities for JSON extraction and scope validation.

## Capabilities

### New Capabilities

- `ai-chat-ops`: Server-side AI chat endpoint returning validated mindmap ops.

### Modified Capabilities

- (none)

## Impact

- Updates `src/app/api/ai/chat/route.ts` and adds new helpers under `src/lib/`.
- Requires `OPENAI_API_KEY` (and Azure endpoint env vars) to be configured on the server.
