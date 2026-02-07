## UI

位置：编辑器右侧 AI 侧栏（`MindmapChatSidebar`）。

### Message audit

对于 assistant 消息：

- 默认仍显示自然语言回复 + 变更摘要（已存在）。
- 新增可展开区域（`details/summary` 或类似 UI）展示 ops JSON。
- 提供 “复制 ops” 按钮（clipboard）。
- 展示 provider/model（以及可选 createdAt）。

### Rollback

- 对本次会话内的 assistant 消息，展示 “回滚到此条 AI 前” 按钮。
- 回滚本质是撤销到历史栈中的某个 past length（不重放 ops，不破坏 redo 语义）。
- 对于历史加载的旧消息（无会话内 marker），不展示回滚按钮或置灰提示。

## Engineering notes

- `MindmapEditor` 维护 history；需要暴露一个回滚回调给 sidebar。
- 对 AI apply 时记录 “应用前的 past length”，并将其绑定到对应 assistant message。
- 后端 POST 响应建议包含 provider/model，避免新消息需要刷新才能看到元信息。
