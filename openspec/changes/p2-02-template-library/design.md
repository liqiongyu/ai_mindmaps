## Context

当前“新建导图”从空白开始，用户需要先想清楚结构再动手，容易卡住。我们已经有稳定的持久化编辑器、原子保存 RPC、以及导图列表页入口，但缺少一个“场景化起点”的模板库与创建流程。

约束与现状：

- 数据持久化依赖 Supabase（`mindmaps` / `mindmap_nodes`）以及原子保存 RPC `mma_replace_mindmap_nodes`
- 编辑器前端状态使用 `MindmapState`（`rootNodeId` + `nodesById`）
- 创建空白导图目前由 `POST /api/mindmaps` 完成（插入 mindmap + root node）

## Goals / Non-Goals

**Goals:**

- 提供一组内置模板（学习/会议/项目/复盘等）作为“可立即编辑”的起点
- 提供模板列表 API（用于前端展示与选择）
- 支持从模板创建新导图（服务端创建，避免前端拼装与覆盖风险）
- 提供统一的新建导图入口（空白 / 模板 / AI 引导）

**Non-Goals:**

- 用户自定义模板、模板编辑/收藏/分享
- 模板市场/后台管理工具
- 复杂的 AI 引导流程（本期仅提供入口与最小可用路径）

## Decisions

1. **模板数据模型采用独立表 `mindmap_templates`（state/ui JSONB）**
   - 选择 JSONB 存储模板的 `MindmapState`（以及可选 `MindmapUiState`），便于和前端/导入逻辑复用。
   - 模板对普通用户只读：RLS 仅开放 `select` 给 `authenticated`。
   - 通过 migration seed 少量内置模板，保证可重复部署与一致性。

2. **API 设计：`GET /api/templates` 返回模板元数据列表**
   - 返回字段以展示为主（`id/slug/title/description/category`），不在列表中返回完整 `state`，避免 payload 过大。
   - 创建从模板导图由后端完成（见下一条），前端不需要拿到完整 state。

3. **从模板创建导图：扩展 `POST /api/mindmaps` 支持 `templateId`**
   - 复用既有的创建入口，避免新增过多端点。
   - 服务端流程：
     1. 读取模板 state/ui
     2. remap 节点 UUID（避免冲突，生成新的 root）
     3. 插入 `mindmaps` 行（`root_node_id` 为 remap 后 root）
     4. 调用 `mma_replace_mindmap_nodes(..., p_base_version := 1)` 原子写入 nodes（并获得新的 version）
     5. 可选写入 `mindmap_ui_state`

4. **前端创建流程页：新增 `/mindmaps/new`**
   - 展示三种创建方式：空白 / 模板 / AI 引导
   - 模板模式下拉取 `GET /api/templates`，点击模板触发创建并跳转编辑页
   - 列表页“新建导图”调整为跳转到 `/mindmaps/new`，确保模板入口可达

## Risks / Trade-offs

- **[Risk] 模板 JSON seed 出错导致创建失败** → 在 API 层使用 `MindmapStateSchema` / `MindmapUiStateSchema` 校验模板数据；seed 保持小规模并加测试覆盖。
- **[Risk] 模板创建链路比空白创建更复杂** → 复用原子保存 RPC，失败时回滚 mindmap 行，返回可诊断错误码。
- **[Trade-off] 复用 `POST /api/mindmaps` 增加参数复杂度** → 保持兼容（空 body 仍创建空白）；仅增加可选字段并严格校验。
