## Problem

随着导图变大，AI 请求上下文（全量 nodes JSON）导致 payload 膨胀、延迟上升，且更容易触发模型输出截断或偏离。

## Goals (P1-02)

- Global scope：使用更轻量的 outline（层级标题 + ids），必要时按深度截断。
- Node scope：仅传子树 + 路径 + 兄弟节点概览，避免全量 nodes。
- 让节点数达到阈值（如 300）时仍能稳定发起 AI 请求。

## Acceptance criteria

- 节点数达到阈值（如 300）仍可稳定发起 AI 请求。
- 请求 payload 明显下降（工程指标）。
