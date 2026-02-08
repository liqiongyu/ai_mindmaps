## 1. Context Budgeting

- [x] 1.1 Add character/line budgets + sibling list trimming in `buildAiChatMindmapContext`
- [x] 1.2 Return `context_too_large` result (with hints + budget meta) when minimum-useful context cannot fit

## 2. API Error Codes

- [x] 2.1 Wire `context_too_large` to `/api/ai/chat` error response (standard code + actionable payload)
- [x] 2.2 Standardize provider failure codes: `model_output_truncated`, `model_output_empty` (include hints)

## 3. Frontend Recovery UX

- [x] 3.1 Add actionable error templates in `MindmapChatSidebar` for standardized codes
- [x] 3.2 Add safe shortcut actions where applicable (e.g. switch to node scope, restore input)

## 4. Tests

- [x] 4.1 Extend `chatContext` unit tests for sibling trimming + budget behavior
- [x] 4.2 Add unit coverage for code→copy mapping (or minimal contract tests)

## 5. Verification

- [x] 5.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`
