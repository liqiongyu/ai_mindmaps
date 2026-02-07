## Context

当前编辑器在以下场景会丢失视图状态：

- 已登录导图（`/mindmaps/:id`）：刷新/再次打开时会重置折叠状态与选中节点，并且画布默认 `fitView`。
- 试玩（`/try`）：目前 try draft 已保存 `collapsedNodeIds` 与 `selectedNodeId`，但未保存 viewport（缩放/平移）。

目标是让用户“继续工作”更顺：恢复上次折叠/选中/视图位置。

约束：

- 不引入新的第三方依赖。
- 已登录导图优先服务端保存（允许同时保留本地回退能力）。
- 公共页（`/public/:slug`）不需要 UI state（不应泄露编辑视图偏好）。

## Goals / Non-Goals

**Goals:**

- persisted mindmap：加载时恢复 UI state；编辑过程中（折叠/选中/viewport 变化）自动保存到服务端（debounce）。
- try mode：在现有 try draft 基础上扩展保存 viewport，并保持向后兼容（旧 draft 仍可读取）。
- 至少满足验收：折叠 + 选中在刷新/再次打开后符合预期（viewport 作为增强项一并实现）。

**Non-Goals:**

- 不对导图数据（nodes/ops）做结构性调整。
- 不在本次实现跨设备实时同步（仅“下次打开”恢复）。
- 不为 public 页面提供 UI state。

## Decisions

1. **新增独立表存储 UI state（避免影响 mindmaps.updated_at 语义 & 避免 public policy 泄露）**
   - 新表：`mindmap_ui_state`
   - 字段：`mindmap_id`（PK/FK）、`collapsed_node_ids`（text[]）、`selected_node_id`（uuid）、`viewport`（jsonb）、`updated_at`
   - RLS：仅 owner 可读写（通过 `exists` join `mindmaps` 表校验 ownership）

2. **API 设计**
   - `GET /api/mindmaps/:id`：在现有 mindmap+nodes 之外，附带 `ui`（可选/为空）
   - `POST /api/mindmaps/:id/ui`：upsert UI state（Zod 校验，过滤非法 node id）

3. **前端保存策略**
   - `MindmapEditor` 在 persisted 模式下：
     - 加载 mindmap 时读取并应用 `ui`（选中节点、折叠集合、viewport）。
     - 监听 `collapsedNodeIds`、`selectedNodeId`、`viewport` 变化，500ms debounce 保存到 `/api/mindmaps/:id/ui`。
     - 使用 `skipNextUiSaveRef` 避免初次加载立即回写。

4. **Viewport 捕获与恢复**
   - 扩展 `MindmapCanvas`：
     - 支持传入 `defaultViewport`（x/y/zoom）
     - 在用户平移/缩放结束时通过 `onMoveEnd` 上报 viewport 到父组件
     - 当存在 saved viewport 时，不强制 `fitView`（避免覆盖用户视图）

## Risks / Trade-offs

- [Risk] viewport 变更频繁导致写入频率高 → Mitigation: 仅在 `onMoveEnd` 保存 + debounce。
- [Risk] `collapsed_node_ids`/`selected_node_id` 引用不存在的节点 → Mitigation: 恢复时校验并过滤；保存时也过滤到当前 state 内存在的 id。
- [Trade-off] `fitView` 与 saved viewport 存在冲突 → Mitigation: 若存在 saved viewport，优先使用 saved viewport；否则维持 `fitView`。

## Migration Plan

1. 新增 SQL migration：创建 `mindmap_ui_state` 表 + RLS policy + updated_at trigger。
2. 部署后端 API（GET 附带 ui + 新增 POST ui 路由）。
3. 部署前端：恢复 ui + 保存 ui。
4. 回滚：前端忽略 ui 字段；后端保留表不影响核心功能（可选移除路由）。
