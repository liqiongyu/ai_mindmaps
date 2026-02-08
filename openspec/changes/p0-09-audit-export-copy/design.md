## Context

当前产品同时存在两类“导出”：

- 画布导出：PNG/SVG（工具栏导出）
- 审计导出：会话审计 JSON（AI 面板导出）

但 `audit_export` 在用量/套餐页与超额提示中被简称为“导出”，导致用户把该配额误认为 PNG/SVG 导出次数。

## Goals / Non-Goals

**Goals:**

- 对外展示统一用语：`audit_export` -> `审计导出(JSON)`。
- 在 AI 面板导出入口旁明确说明“导出的是会话审计 JSON（非 PNG/SVG）”。
- 维持 PNG/SVG 按钮文案为“导出 PNG / 导出 SVG”，并在用量/套餐页明确其不计入 `audit_export`。

**Non-Goals:**

- 不改 metric key（仍使用 `audit_export`）。
- 不引入新的 PNG/SVG 计费/用量指标（若未来需要，新增独立 metric）。

## Decisions

- 文案统一采用 “审计导出(JSON)”：
  - 用量页：`审计导出(JSON)：{used} / {limit}`
  - 套餐页：`审计导出(JSON)：50 / 天`
  - 超额提示：`今日审计导出已达上限，明日重置或升级套餐。`
- AI 面板导出按钮改名为“审计导出”，并通过 `title`/辅助文案澄清其输出为 JSON。

## Risks / Trade-offs

- [Risk] 用户仍可能把“审计导出”理解为“导出导图” → 通过按钮旁提示与用量/套餐一致口径降低误解。
