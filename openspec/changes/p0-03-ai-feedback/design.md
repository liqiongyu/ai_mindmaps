## Context

当前编辑器与聊天仍使用浏览器原生 `alert/confirm` 进行错误提示与危险操作确认。这会：

- 阻断用户当前操作/思考流
- 难以统一视觉与文案
- 不利于无障碍（屏幕阅读器与焦点管理不可控）

同时，AI ops 应用后的“发生了什么”反馈分散在不同位置，不利于建立可控感与可恢复心智。

## Goals / Non-Goals

**Goals:**

- 提供统一的客户端反馈层：toast/banner（非阻断）+ confirm modal（危险操作）
- 以简单 API 暴露：`uiFeedback.enqueue(...)` / `uiFeedback.confirm(...)`
- AI ops 应用成功后，展示变更摘要（例如 toast），确保 2 秒内可见
- 将编辑器关键路径中的 `alert/confirm` 迁移为上述反馈层
- 反馈输出具备可访问性：toast 区域具备 `aria-live`，错误类提示用 `role="alert"`

**Non-Goals:**

- 完整的 a11y 测试/审计体系（P1 再补）
- 复杂的焦点陷阱/多层弹窗栈管理（保持实现简单）

## Decisions

1. **Feedback store 采用轻量 singleton + subscribe**
   - 在 `src/lib/ui/feedback.ts` 内实现内存队列和订阅机制
   - 组件通过 `useSyncExternalStore` 订阅渲染，避免在全局 layout 里引入复杂 Provider

2. **Toast 与 Confirm 分离**
   - Toast：支持 `type (success|info|warning|error)`、`title`、`message`、`actions[]`、可关闭、（可选）自动消失
   - Confirm：使用 modal 形式呈现危险操作（替代 `window.confirm`），并通过 Promise 返回用户选择

3. **全局挂载点放在 RootLayout**
   - RootLayout 渲染一个 client 组件 `UiFeedbackRoot`（负责 toast + confirm modal 渲染）
   - 确保任意页面与路由下反馈可用

4. **AI 变更摘要统一用 operation summary**
   - 复用现有 `summarizeOperations()` 生成 `{add/rename/move/delete}`，并生成统一文案
   - 在 ops 成功应用后 enqueue 成功 toast（不依赖聊天区滚动位置）

## Risks / Trade-offs

- **[Risk] 全局 singleton 导致跨页面遗留提示** → Mitigation：路由切换不清理 toast；但 toast 默认短时自动消失，且提供手动关闭
- **[Risk] Confirm modal 并发请求** → Mitigation：队列化 confirm 请求，一次只展示一个
- **[Risk] 焦点管理不完善** → Mitigation：P0 仅保证 Esc/关闭按钮与 `aria-*`；后续迭代补 focus restore / trap
