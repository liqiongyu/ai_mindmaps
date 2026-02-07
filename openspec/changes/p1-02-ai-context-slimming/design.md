## Context strategy

### Global scope

提供 outline（文本或紧凑 JSON），包含：

- `rootNodeId`
- 以层级方式列出节点：`(id) title`
- 可配置的最大深度（例如 5），超过深度仅保留标题不展开

目标：替代当前全量 `nodes[]` + pretty JSON（含缩进）输出。

### Node scope

提供更聚焦的上下文：

- Selected node: `(id) title`
- Path: root → … → selected（id + title）
- Subtree outline: selected 子树（可配置深度）
- Siblings overview: 同级节点列表（id + title）

### Notes / extra fields

默认不传全量 notes；可仅为 selected node 提供 notes（或截断后的 notes）以支持写备注类请求。

## Engineering notes

- 去掉 `JSON.stringify(..., null, 2)` 的缩进输出，改用更紧凑的序列化。
- 提供纯函数 helper 生成 context，便于单测与未来迭代（缓存/摘要）。
