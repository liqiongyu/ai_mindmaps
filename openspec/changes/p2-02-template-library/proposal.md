## Why

新建导图从空白开始门槛高，缺少场景化入口会降低激活速度与内容产出效率。通过模板库提供“可立即编辑的起点”，让用户更快进入可编辑画布并进一步使用 AI 扩展。

## What Changes

- 新增模板库数据模型：`mindmap_templates`（内置少量高频场景模板）
- 新增模板列表 API：`GET /api/templates`
- 新建导图支持从模板创建（后端创建新导图并写入模板节点，避免前端手工拼装/覆盖）
- 新增新建导图入口页（空白 / 模板 / AI 引导）
- 列表页“新建导图”入口调整为走新建流程页

## Capabilities

### New Capabilities

- `mindmap-templates`: 模板库（数据模型、列表 API、从模板创建导图与前端选择流程）

### Modified Capabilities

<!-- None -->

## Impact

- Supabase：新增 `mindmap_templates` 表 + RLS 策略 + 内置模板 seed 数据
- API：新增 `GET /api/templates`；扩展创建导图流程以支持从模板创建
- Frontend：新增模板选择/新建流程页；列表页入口调整
- Testing：新增/更新 API 集成测试覆盖模板列表与从模板创建
