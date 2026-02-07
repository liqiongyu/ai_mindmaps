## Copy dictionary (source of truth)

Use `docs/p0-p1-execution-plan.md`:

- Navigation & CTA (4.1)
- Editor toolbar labels (4.2)
- AI safety/status hints (4.3)
- Empty/error states (4.4)
- Login/signup copy (4.5)
- Mindmaps list copy (4.6)

## Implementation notes

- Keep this change surgical: replace strings; no behavior changes.
- Prefer consistent terms across pages:
  - Mindmap → 导图
  - Node → 节点
  - Notes → 备注
  - Share → 分享
  - Public (unlisted) → 公开（持链接可见，只读）
  - Private → 私有（仅我可见）
