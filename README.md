# MindMaps AI (MMA)

AI 对话式思维导图工具：通过自然语言对话协作生成与完善思维导图，并保留可视化编辑、分享与导出能力。

- PRD：`docs/prd.md`
- P0/P1/P2 执行清单（体验、质量与增长）：`docs/p0-p1-execution-plan.md`
- GitHub/`gh` 操作：`docs/github-cli.md`
- 发布流程：`docs/release.md`

## 本地开发（预期）

```bash
corepack enable
pnpm install
pnpm dev
```

环境变量：复制 `.env.example` 为 `.env.local` 并填写。

## 贡献约定

- 分支：trunk-based（`main`）+ PR 合并
- commit：Conventional Commits（commitlint 校验）
- 本地 hooks：lefthook（提交前 format/lint/typecheck，push 前 test）
