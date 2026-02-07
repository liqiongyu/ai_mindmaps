## 1. Shared Validation Utilities

- [x] 1.1 Add Zod schema for `/api/ai/chat` request + expected model output
- [x] 1.2 Add robust JSON extraction/parsing helper for model output

## 2. Scope Enforcement

- [x] 2.1 Add subtree computation helper for node-scoped chat
- [x] 2.2 Implement scope validation for ops (allow new node IDs created in-batch)

## 3. API Route

- [x] 3.1 Implement `POST /api/ai/chat` (load mindmap, call Azure OpenAI, validate, return ops)
- [x] 3.2 Dry-run ops via `applyOperations()` to reject invalid batches

## 4. Tests and Verification

- [x] 4.1 Add unit tests for JSON parsing + scope validation
- [x] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
