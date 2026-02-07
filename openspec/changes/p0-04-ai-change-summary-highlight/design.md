## UX placement

- **Change summary**: render directly under each assistant message (for that message’s operations).
- **Highlights**: on the mindmap canvas nodes, auto-clear after ~3.5s.

## Summary format (P0)

Text (zh-CN):

`变更摘要：新增 {add} · 改名 {rename} · 移动 {move} · 删除 {delete}`

Notes:

- `update_notes` is not counted in the P0 summary (can be added later).
- `reorder_children` is either ignored or merged into `move` (decide once and keep consistent).

## Highlight rules (P0)

- Highlight nodes by operation type:
  - `add_node` → green
  - `rename_node` → blue
  - `move_node` → purple
- No node highlight for `delete_node` (node is gone); rely on summary/toast.
- The highlight class should fade naturally via `transition-colors` when cleared.

## Safety mode: no delete_node (P0)

Enforcement:

1. Prompt constraint: instruct the model not to output `delete_node`.
2. Server-side validation: if operations include `delete_node`, respond `400` with a message:

`为安全起见，AI 默认不会删除节点。如需删除，请明确说明要删除哪些节点。`

## Data flow

- `/api/ai/chat` already persists assistant messages and operations.
- Chat sidebar already receives `operations` from POST; GET can be extended to expose operations for history rendering.
- Editor receives operations via `onApplyOperations(operations)` and can set a highlight state derived from those ops.
