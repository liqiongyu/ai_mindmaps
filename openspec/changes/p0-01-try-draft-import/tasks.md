## 1. Auth redirect support

- [x] 1.1 Add `next` redirect support to `/login` and `/signup`
- [x] 1.2 Pass `next=/try` from try-mode banner links

## 2. Import decision modal

- [x] 2.1 Detect authenticated user + local try draft and show one-time modal
- [x] 2.2 Implement import / blank-start / discard actions with loading + errors

## 3. Backend import API

- [x] 3.1 Add `POST /api/mindmaps/import-try` with request validation
- [x] 3.2 Remap draft IDs to UUIDs and persist via atomic RPC
- [x] 3.3 Best-effort persist of UI state (if available)

## 4. Tests + verification

- [x] 4.1 Unit tests for ID remapping + UI mapping
- [x] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s test` pass
