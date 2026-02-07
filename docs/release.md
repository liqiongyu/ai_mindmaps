# 发布流程（MMA）

最后更新：2026-02-07

本项目默认策略：**trunk-based（main）+ PR 合并**，并通过 **Vercel Git 集成**自动部署生产环境。

## TL;DR

- 发布（生产部署）：PR checks 全绿 → merge 到 `main` → 等 Vercel 生产部署完成
- E2E：在 Actions 里手动触发 `E2E`（需要配置 Azure OpenAI 相关 secrets）
- Release notes / Tag：合并到 `main` 后由 `Release Please` 自动开 release PR；合并该 PR 会自动打 tag 并创建 GitHub Release

## 1) 发布前检查（建议顺序）

1. PR 上 `CI`、`Dependency Review`、`Vercel` 均通过（分支保护已要求）
2. 如本次改动涉及 AI provider / 网络依赖：手动触发 `E2E`
3. 预览环境（Vercel Preview）验证关键路径（登录、创建/编辑、分享、导出）

## 2) 触发 E2E（可选但推荐）

前提：仓库已配置以下 secrets（见 `docs/github-cli.md`）：

- `OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- （可选）`AZURE_OPENAI_API_VERSION`、`AZURE_OPENAI_MODEL`

触发方式：

```bash
gh workflow run E2E
gh run watch
```

## 3) 合并与生产部署

1. Merge PR（推荐 squash merge，保持线性历史）
2. 等待 Vercel 对 `main` 的 Production 部署完成
3. 线上回归：打开生产地址做一次轻量冒烟（导入/编辑/导出）

## 4) 版本与 Release（可选但推荐）

合并到 `main` 后，`Release Please` 会根据 Conventional Commits 自动创建 release PR：

- 合并 release PR → 自动创建 tag（例如 `v0.1.1`）并生成 GitHub Release（自动 notes）

如果你更倾向于手动发布，也可以直接生成 Release：

```bash
gh release create v0.1.0 --generate-notes
```
