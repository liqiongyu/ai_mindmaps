## Why

编辑器与聊天仍存在阻断式反馈（`alert/confirm`），并且 AI 改动的“可控感”反馈不稳定，容易打断用户连续思考与信任建立。我们需要一套统一的非阻断反馈层（toast/banner + 危险确认弹窗），并把 AI 改图后的变更摘要与错误恢复路径统一呈现。

## What Changes

- 新增前端反馈层 `uiFeedback.enqueue({ type, title, message, actions[] })`，用于统一展示成功/失败/警告提示，并支持操作按钮
- 新增危险操作确认弹窗（替代 `window.confirm`），用于回滚/停止分享/删除导图等高风险操作
- AI ops 应用成功后，统一展示变更摘要（例如 toast），保证 2 秒内可见
- 将编辑器关键路径中的 `alert/confirm` 替换为非阻断反馈（保留危险操作二次确认语义）
- 异步错误与状态更新支持屏幕阅读器可读（`aria-live` / `role=alert`）

## Capabilities

### New Capabilities

- `ui-feedback`: 全局 toast/banner 队列 + 危险确认弹窗，提供统一 API（enqueue/confirm）与可访问性输出（aria-live）

### Modified Capabilities

- （无）

## Impact

- 新增：`src/lib/ui/*`（feedback store + types）
- 新增：全局反馈渲染组件（挂载到 `src/app/layout.tsx`）
- 修改：`MindmapEditor` / `MindmapChatSidebar` / `MindmapCanvas` 中的错误与确认交互
