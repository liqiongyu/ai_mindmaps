## Why

当前有 North Star 与关键路径定义，但缺少统一事件埋点、可分层的 API 结构化日志与最小仪表盘，导致：

- 无法量化激活漏斗（/ → /try → 编辑 → 导出/分享 → 登录 → 云端保存）
- 难以定位保存失败高发阶段与失败原因分布
- AI 失败无法被快速归因（校验 / scope 越界 / provider 错误等）

## What Changes

- 增加最小 Telemetry 体系：客户端事件 SDK + 服务端接收与落库（Supabase）
- 为核心 UI 路径接入关键事件：`landing_cta_click`, `try_opened`, `editor_opened`, `node_added`, `ai_request_sent`, `ai_ops_applied`, `mindmap_saved`, `export_succeeded`, `share_link_generated`
- 为核心 API 增加结构化日志（JSON）与错误码（用于分布统计）
- 提供一个最小“内部仪表盘”页面，展示按日漏斗与关键健康指标（保存/AI）

## Capabilities

### New Capabilities

- `telemetry-events`: 统一事件采集与落库（session 维度）
- `observability-dashboard`: 最小仪表盘（按日漏斗 + 关键健康指标）

### Modified Capabilities

- `api-logging`: `/api/mindmaps/*` 与 `/api/ai/chat` 输出结构化日志与 error code
