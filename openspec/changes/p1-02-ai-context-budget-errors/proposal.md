## Why

Large mindmaps can still exceed practical context budgets for the LLM, which reduces AI success rate and leaves users with unclear, non-actionable failures. We need predictable context sizing plus standardized, actionable error codes so users can recover quickly.

## What Changes

- Add budgeted context building (line/character budgets) for both `global` and `node` scopes.
- When the context cannot be built with a minimum useful budget, return a standardized error code with recovery hints instead of a generic failure.
- Standardize `/api/ai/chat` error codes for common provider failure modes:
  - `context_too_large`
  - `model_output_truncated`
  - `model_output_empty`
- Add frontend error templates that translate these codes into actionable guidance (e.g. switch to node mode, reduce depth, narrow the branch).
- Ensure these error codes are emitted via API structured logs so truncation/empty-output rates can be monitored.

## Capabilities

### New Capabilities

- `ai-chat-context-budget`: Budgeted AI context construction + standardized error codes and recovery hints for `/api/ai/chat`.

### Modified Capabilities

<!-- none -->

## Impact

- Backend: `src/lib/ai/chatContext.ts`, `src/app/api/ai/chat/route.ts`
- Frontend: `src/app/mindmaps/[mindmapId]/MindmapChatSidebar.tsx`
- Tests: extend `src/lib/ai/chatContext.test.ts` (and add targeted unit tests for new behavior)
