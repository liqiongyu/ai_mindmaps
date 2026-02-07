## 1. UI (sidebar)

- [x] 1.1 Add prompt chips and click-to-fill behavior
- [x] 1.2 Add Advanced constraints panel (language/branches/depth/move/delete)
- [x] 1.3 Display constraints summary per AI response

## 2. API / prompting

- [x] 2.1 Extend `AiChatRequestSchema` to accept constraints
- [x] 2.2 Inject constraints into model instructions/input
- [x] 2.3 Enforce allowMove/allowDelete server-side

## 3. Tests

- [x] 3.1 Unit tests for constraints formatting/validation helpers

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
