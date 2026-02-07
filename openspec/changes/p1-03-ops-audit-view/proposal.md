## Problem

AI 改图的信任需要可复盘。仅展示自然语言回复会让用户不确定 AI “到底做了什么”，也不利于排查与成本审计。

## Goals (P1-03)

- assistant 消息可展开查看 ops（可复制）。
- 支持“回滚到此条 AI 前”（基于历史栈回退到对应版本）。
- 展示 provider/model（已在 DB 留字段）。

## Acceptance criteria

- 用户可以复盘“AI 到底改了什么”。
- 一键回滚不破坏历史栈一致性。
