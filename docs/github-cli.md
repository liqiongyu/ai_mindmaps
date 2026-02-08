# GitHub 配置与 `gh` 操作手册（MMA）

最后更新：2026-02-08

本文件用于把 MMA 的 GitHub 侧配置“写成可执行的命令与脚本”。默认策略：**trunk-based（main）+ PR 合并**，并使用 GitHub Actions 做基础 CI。

---

## 1) 前置条件

- 本机安装 GitHub CLI：`gh`
- 登录：`gh auth login`
- 本地仓库已 `git init`，并至少有 1 个 commit

检查登录状态：

```bash
gh auth status
```

---

## 2) 创建远端仓库（推荐：私有）

在仓库根目录执行（假设目录名为 `ai_mindmaps`）：

```bash
OWNER="$(gh api user -q .login)"
REPO="ai_mindmaps"

gh repo create "$OWNER/$REPO" \
  --private \
  --source=. \
  --remote=origin \
  --push
```

如果你想创建到某个组织，把 `OWNER` 改成组织名即可：

```bash
OWNER="your-org"
```

---

## 3) Labels（建议集合）

创建常用 labels（可按需删减）：

```bash
gh label create "type/feat" --color "1D76DB" --description "New feature" || true
gh label create "type/bug"  --color "D93F0B" --description "Bug fix" || true
gh label create "type/chore" --color "C5DEF5" --description "Chore / maintenance" || true
gh label create "type/docs" --color "0075ca" --description "Documentation" || true
gh label create "type/ci" --color "000000" --description "CI related" || true

gh label create "area/frontend" --color "A2EEEF" --description "Frontend" || true
gh label create "area/backend" --color "A2EEEF" --description "Backend" || true
gh label create "area/ai" --color "A2EEEF" --description "LLM / prompting / ops" || true
gh label create "area/infra" --color "A2EEEF" --description "Infra / tooling" || true

gh label create "prio/p0" --color "B60205" --description "Blocker" || true
gh label create "prio/p1" --color "D93F0B" --description "High" || true
gh label create "prio/p2" --color "FBCA04" --description "Medium" || true
gh label create "prio/p3" --color "0E8A16" --description "Low" || true
```

---

## 4) 分支保护（main）

GitHub 分支保护需要仓库管理员权限。下面命令使用 `gh api` 调 GitHub REST API。

> 注意：如果仓库是 **private** 且账号套餐不支持分支保护，你可能会收到 `HTTP 403` 提示
> “Upgrade to GitHub Pro or make this repository public to enable this feature.”  
> 这时需要：升级到 GitHub Pro，或将仓库改为 public（或改用后续可用的替代机制）。

说明（推荐基线）：

- 必须通过 CI（以及安全检查）
- 必须走 PR
- 禁止 force push
- `required_approving_review_count` 可按团队策略调整
- 若你要让 release PR 全自动合并，需满足其一：
  - 把 `required_approving_review_count` 设为 `0`
  - 或使用 ruleset 给 `github-actions` / release bot 配置 review 豁免

```bash
OWNER="$(gh api user -q .login)"
REPO="ai_mindmaps"
BRANCH="main"
REQUIRED_APPROVALS=0 # 团队若要求人工 review，可改成 1

gh api -X PUT "repos/$OWNER/$REPO/branches/$BRANCH/protection" \
  -H "Accept: application/vnd.github+json" \
  -F required_status_checks[strict]=true \
  -F required_status_checks[contexts][]=CI \
  -F required_status_checks[contexts][]="Dependency Review" \
  -F required_status_checks[contexts][]=Vercel \
  -F required_pull_request_reviews[dismiss_stale_reviews]=true \
  -F required_pull_request_reviews[required_approving_review_count]="$REQUIRED_APPROVALS" \
  -F required_conversation_resolution=true \
  -F required_linear_history=true \
  -F enforce_admins=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F restrictions=null
```

> 注意：`contexts[]` 必须与 GitHub Checks 里的名字完全一致（大小写也要一致）。

---

## 5) 仓库合并策略（建议）

为支持 release PR 自动合并，建议开启仓库级 Auto-merge，并限制为 squash：

```bash
OWNER="$(gh api user -q .login)"
REPO="ai_mindmaps"

gh api -X PATCH "repos/$OWNER/$REPO" \
  -F allow_auto_merge=true \
  -F delete_branch_on_merge=true \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false
```

---

## 6) Secrets（Actions 用）

推荐先把 key 的“名字”固定下来：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MMA_LLM_API_KEY`
- `MMA_LLM_BASE_URL`（可选，OpenAI-compatible 时用）
- `MMA_LLM_MODEL`
- `OPENAI_API_KEY`（用于 Azure OpenAI e2e）
- `AZURE_OPENAI_ENDPOINT`（用于 Azure OpenAI e2e）
- `AZURE_OPENAI_DEPLOYMENT`（用于 Azure OpenAI e2e）
- `AZURE_OPENAI_API_VERSION`（可选，用于 Azure OpenAI e2e）
- `AZURE_OPENAI_MODEL`（可选，用于 Azure OpenAI e2e）
- `RELEASE_PLEASE_TOKEN`（用于 release PR 触发 `CI` / `Dependency Review`）

`RELEASE_PLEASE_TOKEN` 建议使用 Fine-grained PAT（仅授权当前仓库）：

- Repository permissions / Contents: `Read and write`
- Repository permissions / Pull requests: `Read and write`

设置示例：

```bash
gh secret set NEXT_PUBLIC_SUPABASE_URL
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY
gh secret set MMA_LLM_API_KEY
gh secret set MMA_LLM_MODEL
gh secret set RELEASE_PLEASE_TOKEN
```

---

## 7) 常用 PR 工作流（推荐）

```bash
# 新建分支
git checkout -b feat/xxx

# 提交（遵循 Conventional Commits）
git commit -m "feat: xxx"

# 推送并创建 PR
git push -u origin HEAD
gh pr create --fill

# 查看 checks
gh pr checks
```
