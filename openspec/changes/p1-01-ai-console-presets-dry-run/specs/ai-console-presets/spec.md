## Spec: AI Console 2.0 (presets + dry-run preview)

### Presets

**Table**: `ai_constraint_presets`

- `owner_id` is required and equals `auth.uid()`
- `config` stores `AiChatConstraints`:
  - `outputLanguage: "zh" | "en"`
  - `branchCount: 2 | 4 | 6 | 8`
  - `depth: 1 | 2 | 3`
  - `allowMove: boolean`
  - `allowDelete: boolean`

### Chat request

`POST /api/ai/chat`

Request (新增字段)：

- `dryRun?: boolean`
- `providedOutput?: { assistant_message: string, operations: Operation[], provider?: string | null, model?: string | null }`

Response (新增字段)：

- `changeSummary: { add, rename, move, delete, reorder }`
- `deleteImpact: { nodes: number }`

### High-risk confirmation

- 当 `deleteImpact.nodes >= 10` 时必须触发确认弹窗
- 弹窗需要展示摘要：新增/改名/移动/删除及删除影响节点数

### Observability

- `dryRun` 与 `confirm` 的失败必须返回稳定 `code`
