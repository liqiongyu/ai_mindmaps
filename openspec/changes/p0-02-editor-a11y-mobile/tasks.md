## 1. Mobile AI drawer

- [x] 1.1 Add `mode="drawer"` support to `MindmapChatSidebar` (open/close, esc, backdrop)
- [x] 1.2 Add header `AI` button on `<lg` to toggle drawer

## 2. Canvas keyboard reachability

- [x] 2.1 Make nodes focusable (`role="button"`, `tabIndex={0}`) and select-on-focus
- [x] 2.2 Ensure keyboard shortcuts work without double-click dependency

## 3. Global a11y affordances

- [x] 3.1 Add skip link in `layout.tsx`
- [x] 3.2 Add global `focus-visible` styling in `globals.css`

## 4. Verification

- [x] 4.1 Verify `pnpm -s format:check`, `pnpm -s lint`, `pnpm -s typecheck`, `pnpm -s test`, and `pnpm -s build` pass
