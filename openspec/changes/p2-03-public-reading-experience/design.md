## Context

当前公开页（`/public/:slug`）已具备只读画布与节点备注抽屉，但仍存在三个核心缺口：

1. **备注仅按纯文本展示**，缺少结构化与可读性（列表/链接/代码块等）。
2. **缺少节点深链接能力**，无法直接分享“某个节点”的阅读上下文（路径 + 备注）。
3. **分享预览卡片信息不足**，站外传播时无法形成可识别的预览（OG 图/摘要）。

现有公开数据边界已通过 RPC `mma_get_public_mindmap_snapshot` 收敛（#103 已完成）。

## Goals / Non-Goals

**Goals:**

- 在公开页以**安全**方式渲染节点备注 Markdown（不允许 XSS、脚本、危险 URL）
- 支持节点深链接（`?node=...`），打开即选中/高亮该节点并尽可能聚焦到视口
- 补齐 OG 预览：提供可识别的 `og:image` 与摘要描述

**Non-Goals:**

- 用户自定义公开页主题/模板
- 复杂的目录树导航（本期只做路径导航 + 深链）
- 公开页上的编辑能力

## Decisions

1. **Markdown 渲染方案：`react-markdown` + `remark-gfm` + `rehype-sanitize`**
   - 选择 React 组件渲染而非 `dangerouslySetInnerHTML`，默认禁用 raw HTML。
   - 使用 sanitize 白名单确保链接、代码块、列表等可用，同时阻断脚本与危险属性。
   - 落地为 `SafeMarkdown` 组件，供公开页复用。

2. **深链接参数：UI 使用 `?node=`，API 同时兼容 `node` 与 `nodeId`**
   - UI 与文案更短、更易记（`node`）。
   - API 按 Spec 支持 `nodeId`，并兼容 `node` 作为别名，避免未来对齐成本。
   - 选中节点时使用 `history.replaceState` 更新 URL，避免 Next 导航与重复数据拉取。

3. **节点定位：在 `MindmapCanvas` 增加 `focusNode(nodeId)` 能力**
   - `ReactFlowInstance.setCenter(...)` 在已渲染/测量后可将节点居中。
   - 公开页仅在“通过深链进入”时自动聚焦，避免用户普通点击时频繁跳动视口。
   - 高亮复用现有 `selected` 样式（边框加深），必要时可追加一次性闪烁效果（本期可选）。

4. **OG 生成：新增 `GET /api/og/public/:slug` 返回 `ImageResponse`**
   - 避免引入外部截图服务，直接用 Next `next/og` 在边缘/Node 生成图片。
   - `generateMetadata` 为 `/public/:slug` 设置 `openGraph.images` 指向该 API。
   - 摘要优先取深链节点的 notes（截断 + 去 Markdown），否则取导图标题/默认描述。

5. **公开快照 API：扩展 `GET /api/public/:slug` 支持可选 `nodeId`**
   - 继续返回完整 `state`（保持兼容）。
   - 当传入 `nodeId/node` 且命中时，额外返回 `focusedNode`（`id/text/notes/breadcrumb`），便于前端或 OG 复用。

## Risks / Trade-offs

- **[Risk] Markdown XSS / 钓鱼链接** → `rehype-sanitize` 白名单 + 链接协议限制（仅 http/https/mailto）+ `rel="noreferrer noopener"`.
- **[Risk] OG 图片生成需要拉取快照，可能较慢** → 仅用于分享预览；后续可通过缓存/只取标题与节点摘要优化。
- **[Trade-off] URL 自动更新会影响浏览器历史** → 使用 `replaceState` 而非 `pushState`，避免堆积历史记录。
