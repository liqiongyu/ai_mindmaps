## 1. Draft Storage

- [x] 1.1 Add `tryDraft` schema + parse/serialize helpers (key: `mma:try:draft:v1`)
- [x] 1.2 Add unit tests for draft parsing/serialization

## 2. Try-Mode Editor

- [x] 2.1 Add `mode=\"try\"` to `MindmapEditor` and load initial draft from `localStorage`
- [x] 2.2 Persist draft state + UI state to `localStorage` with debounce and error handling
- [x] 2.3 Add try-mode banner (login/signup guidance) and keep AI/share disabled

## 3. Routing

- [x] 3.1 Update `/try` route to render the editor in try mode

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s test` pass
