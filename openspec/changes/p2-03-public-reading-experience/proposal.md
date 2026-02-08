## Why

当前公开页的“阅读/传播”体验偏基础：备注仅纯文本、缺少节点深链接能力、分享卡片预览信息不足，影响用户在站外传播与站内阅读效率。

## What Changes

- 公开页节点备注支持**安全 Markdown** 渲染（避免 XSS）
- 支持节点深链接（`/public/:slug?node=...`），打开即定位/高亮并展示该节点备注与路径
- 分享页补齐 OG 元信息：生成 `og:image` 预览图与摘要（优先展示当前节点/导图标题）

## Capabilities

### New Capabilities

- `public-mindmap-reading`: 公开页阅读体验（Markdown 备注、节点深链/高亮、OG 预览图与摘要）

### Modified Capabilities

<!-- None -->

## Impact

- Frontend:
  - `src/app/public/[slug]/*`：公开页阅读 UI（Markdown、深链、复制节点链接）
  - `src/app/mindmaps/[mindmapId]/MindmapCanvas.tsx`：补齐“聚焦节点”能力以支持深链定位（若需要）
- Backend:
  - `src/app/api/public/[slug]/route.ts`：支持可选 `nodeId` / `node` 查询参数（返回聚焦节点信息或用于 OG）
  - 新增 OG 图片生成（如 `opengraph-image.tsx` 或 API route）
- Dependencies: 可能新增 Markdown 渲染与 sanitize 相关依赖
