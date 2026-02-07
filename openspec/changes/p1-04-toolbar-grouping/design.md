## Context

当前 `MindmapEditor` 顶部工具栏将大量按钮平铺在同一行，导致：

- 信息密度高，用户需要花更多时间“找按钮”；
- 危险操作（删除节点 / 删除导图等）在主操作区暴露，容易误触；
- tooltip/热键提示不一致（仅部分按钮有 `title`），不利于学习与效率。

约束：

- 不引入新的 UI 组件依赖（仅用现有 React + Tailwind + 原生元素）。
- 现有行为保持：导图编辑/导出/分享/删除的业务逻辑不变，仅调整入口与呈现。

## Goals / Non-Goals

**Goals:**

- 工具栏按 `编辑 / 结构 / 视图 / 导出 / 分享` 清晰分组，降低认知负担。
- 危险操作收进二级菜单（kebab menu），减少误触（并保留二次确认）。
- 工具栏 tooltip 与热键提示格式统一（有热键则展示，无热键仅展示动作名）。

**Non-Goals:**

- 不新增/调整编辑器快捷键集合（仅补齐提示，不新增绑定）。
- 不引入第三方 dropdown / popover 组件库。
- 不调整导图数据结构、导出实现或分享 API。

## Decisions

1. **分组以“可见一键操作”为主**
   - 大部分高频动作仍保留为直接按钮（1 次点击可达）。
   - 通过视觉分隔与分组 label 降低“按钮墙”感。

2. **危险操作使用原生 `<details>` 实现 kebab menu**
   - 采用原生语义，减少自研可访问性/键盘交互成本。
   - 菜单项点击后主动关闭菜单（通过 ref 置 `open=false`），避免遮挡。

3. **tooltip 与热键提示统一使用 `title`**
   - 基于现有实现（undo/redo 已有 title），扩展到所有工具栏入口。
   - 热键提示遵循现有 keybindings（Undo/Redo、Enter、Tab、Backspace/Delete、F2 等）。

## Risks / Trade-offs

- [Risk] `<details>` 在不同浏览器的样式与交互存在细微差异 → Mitigation: 使用 Tailwind 约束布局与边框，菜单项点击后关闭；必要时可后续替换为自定义 popover。
- [Risk] 工具栏分组后在窄屏会换行 → Mitigation: 使用 `flex-wrap` 并保持按钮紧凑；优先保证功能可达而非单行展示。
- [Trade-off] tooltip 依赖 `title`（较基础）→ 后续可替换为自定义 tooltip，但本次以一致性与零依赖为目标。
