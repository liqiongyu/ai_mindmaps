## Why

当前编辑器工具栏为“平铺按钮”，信息密度高且危险操作（删除/删除导图等）容易误触，影响效率与安全感。

## What Changes

- 将编辑器工具栏按 `编辑 / 结构 / 视图 / 导出 / 分享` 分组，降低信息密度与误触概率。
- 将危险操作（删除节点、删除导图等）收进二级菜单（kebab menu），并保留二次确认。
- 统一工具栏 tooltip 与热键提示（有热键的展示一致格式）。

## Capabilities

### New Capabilities

- `toolbar-grouping`: 编辑器工具栏分组 + 危险操作收敛（二级菜单）+ tooltip/热键提示统一。

### Modified Capabilities

- （无）

## Impact

- UI：`src/app/mindmaps/[mindmapId]/MindmapEditor.tsx`（工具栏与分享区域）。
- 交互：危险操作入口位置变化，减少误触；tooltip 文案统一。
- 无新增/变更 API；现有导出/分享/删除等行为保持不变。
