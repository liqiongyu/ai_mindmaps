## Why

当前把 `audit_export` 对外展示为“导出”，会让用户误解为 PNG/SVG 导图导出次数，造成用量心智偏差与不信任。

## What Changes

- 将 `audit_export` 对外展示统一为“审计导出(JSON)”（或同义口径），避免与 PNG/SVG 导出混淆。
- 在 AI 面板的导出入口旁补充说明：该导出为“会话审计 JSON”，不是 PNG/SVG。
- 更新套餐页/用量页与超额提示文案，保持一致口径。

## Capabilities

### New Capabilities

- `audit-export-copy`: 统一审计导出（JSON）在 UI、套餐页与错误提示中的文案口径。

### Modified Capabilities

<!-- None: copy/label changes only -->

## Impact

- UI: `src/app/mindmaps/page.tsx`、`src/app/pricing/page.tsx`、`src/app/mindmaps/[mindmapId]/MindmapChatSidebar.tsx`
- API: `/api/ai/chat/export` 的 `quota_exceeded` 文案
