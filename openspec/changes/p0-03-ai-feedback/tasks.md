## 1. Feedback foundation

- [x] 1.1 Implement `uiFeedback` store (`enqueue`, `dismiss`, `confirm`) in `src/lib/ui/feedback.ts`
- [x] 1.2 Add `UiFeedbackRoot` (toast + confirm modal, `aria-live`) and mount in `layout.tsx`

## 2. Replace blocking dialogs

- [x] 2.1 Replace editor `alert/confirm` with `uiFeedback` (`MindmapEditor`)
- [x] 2.2 Replace canvas inline edit `alert` with `uiFeedback` (`MindmapCanvas`)
- [x] 2.3 Replace chat/sidebar `alert/confirm` with `uiFeedback` (`MindmapChatSidebar`)

## 3. AI summary & recovery

- [x] 3.1 Enqueue AI change summary within 2 seconds after ops applied
- [x] 3.2 Ensure error feedback includes a recovery path where feasible (retry / rollback)

## 4. Verification

- [x] 4.1 Add unit tests for `uiFeedback` store behavior
- [x] 4.2 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
