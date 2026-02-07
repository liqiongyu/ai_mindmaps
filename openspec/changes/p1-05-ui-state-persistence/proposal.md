## Why

用户刷新/再次打开导图时视图状态丢失，会造成“继续工作”的摩擦（需要重新折叠、重新定位、重新找到节点）。

## What Changes

- 持久化关键 UI 状态：
  - 折叠状态（collapsed）
  - 上次选中节点（selected）
  - 缩放/居中（viewport：x/y/zoom）
- 作用范围：
  - 试玩（`/try`）：存 `localStorage`（try draft）
  - 已登录导图（`/mindmaps/:id`）：优先服务端保存并在加载时恢复

## Capabilities

### New Capabilities

- `view-state-persistence`: 编辑器视图状态的加载/保存（collapsed/selected/viewport），支持 try 与 persisted 两种模式。

### Modified Capabilities

- （无）

## Impact

- 数据层：新增 UI state 存储（Supabase 表/策略）与对应 API。
- 前端：`MindmapEditor` 加载/保存 UI state；`MindmapCanvas` 暴露 viewport 变化以供持久化。
