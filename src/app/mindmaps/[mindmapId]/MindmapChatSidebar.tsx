"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AiChatConstraints } from "@/lib/ai/chat";
import {
  DEFAULT_AI_CHAT_CONSTRAINTS,
  formatAiChatConstraintsSummary,
} from "@/lib/ai/chatConstraints";
import type { Operation } from "@/lib/mindmap/ops";
import { summarizeOperations } from "@/lib/mindmap/operationSummary";

type ChatScope = "global" | "node";
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  operations?: Operation[] | null;
  constraints?: AiChatConstraints;
};

const PROMPT_CHIPS: Array<{ label: string; template: string }> = [
  { label: "扩展分支", template: "扩展分支：围绕当前主题补充更多分支。" },
  { label: "补全细节", template: "补全细节：为每个分支补充细节与要点。" },
  { label: "重组结构", template: "重组结构：调整层级与分组，使结构更清晰。" },
  { label: "提炼为行动项", template: "提炼为行动项：把内容整理成可执行的行动项清单。" },
  { label: "生成示例", template: "生成示例：为关键节点补充示例/案例。" },
  { label: "找出风险", template: "找出风险：补充风险点与对应缓解措施。" },
];

function getRoleLabel(role: ChatMessage["role"]): string {
  switch (role) {
    case "assistant":
      return "AI";
    case "system":
      return "系统";
    case "user":
    default:
      return "用户";
  }
}

function getThreadKey(scope: ChatScope, selectedNodeId: string | null): string | null {
  if (scope === "global") return "global";
  if (!selectedNodeId) return null;
  return `node:${selectedNodeId}`;
}

export function MindmapChatSidebar({
  mindmapId,
  selectedNodeId,
  selectedNodeLabel,
  onApplyOperations,
}: {
  mindmapId: string;
  selectedNodeId: string | null;
  selectedNodeLabel: string;
  onApplyOperations: (operations: Operation[]) => { ok: true } | { ok: false; message: string };
}) {
  const [scope, setScope] = useState<ChatScope>("global");
  const [messagesByThreadKey, setMessagesByThreadKey] = useState<Record<string, ChatMessage[]>>({});
  const [attemptedLoadByThreadKey, setAttemptedLoadByThreadKey] = useState<Record<string, boolean>>(
    {},
  );
  const [loadingByThreadKey, setLoadingByThreadKey] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [constraints, setConstraints] = useState<AiChatConstraints>(DEFAULT_AI_CHAT_CONSTRAINTS);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScope("global");
    setMessagesByThreadKey({});
    setAttemptedLoadByThreadKey({});
    setLoadingByThreadKey({});
    setInput("");
    setConstraints(DEFAULT_AI_CHAT_CONSTRAINTS);
    setError(null);
    setSending(false);
  }, [mindmapId]);

  const nodeModeBlocked = scope === "node" && !selectedNodeId;
  const threadKey = useMemo(() => getThreadKey(scope, selectedNodeId), [scope, selectedNodeId]);
  const historyLoading = threadKey ? (loadingByThreadKey[threadKey] ?? false) : false;
  const historyAttempted = threadKey ? (attemptedLoadByThreadKey[threadKey] ?? false) : false;
  const messages = threadKey ? (messagesByThreadKey[threadKey] ?? []) : [];

  useEffect(() => {
    setError(null);
  }, [threadKey]);

  useEffect(() => {
    if (!threadKey || historyAttempted) return;

    const controller = new AbortController();
    setLoadingByThreadKey((prev) => ({ ...prev, [threadKey]: true }));
    setError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({
          mindmapId,
          scope,
        });
        if (scope === "node" && selectedNodeId) {
          params.set("selectedNodeId", selectedNodeId);
        }

        const res = await fetch(`/api/ai/chat?${params.toString()}`, {
          signal: controller.signal,
        });

        const json = (await res.json().catch(() => null)) as
          | {
              ok: true;
              messages: Array<{
                role: ChatMessage["role"];
                content: string;
                operations?: Operation[] | null;
              }>;
            }
          | { ok: false; message?: string }
          | null;

        if (!res.ok || !json || json.ok !== true) {
          throw new Error(
            (json && "message" in json && json.message) || `加载聊天记录失败（${res.status}）`,
          );
        }

        const nextMessages = Array.isArray(json.messages)
          ? json.messages
              .filter(
                (m) =>
                  m &&
                  (m.role === "user" || m.role === "assistant" || m.role === "system") &&
                  typeof m.content === "string",
              )
              .map((m) => ({
                role: m.role,
                content: m.content,
                operations:
                  m.role === "assistant" && Array.isArray(m.operations) ? m.operations : null,
              }))
          : [];

        setMessagesByThreadKey((prev) => ({ ...prev, [threadKey]: nextMessages }));
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "加载聊天记录失败";
        setError(message);
      } finally {
        setLoadingByThreadKey((prev) => ({ ...prev, [threadKey]: false }));
        if (!controller.signal.aborted) {
          setAttemptedLoadByThreadKey((prev) => ({ ...prev, [threadKey]: true }));
        }
      }
    })();

    return () => controller.abort();
  }, [historyAttempted, mindmapId, scope, selectedNodeId, threadKey]);

  const canSend = useMemo(() => {
    if (nodeModeBlocked) return false;
    return input.trim().length > 0 && !sending && historyAttempted;
  }, [historyAttempted, input, nodeModeBlocked, sending]);

  const onApplyChip = useCallback((template: string) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return template;
      return `${trimmed}\n${template}`;
    });
  }, []);

  const onSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    if (scope === "node" && !selectedNodeId) return;
    const activeThreadKey = getThreadKey(scope, selectedNodeId);
    if (!activeThreadKey) return;

    const constraintsSnapshot = { ...constraints };
    setSending(true);
    setError(null);
    setInput("");
    setMessagesByThreadKey((prev) => ({
      ...prev,
      [activeThreadKey]: [...(prev[activeThreadKey] ?? []), { role: "user", content }],
    }));
    setAttemptedLoadByThreadKey((prev) => ({ ...prev, [activeThreadKey]: true }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mindmapId,
          scope,
          selectedNodeId: scope === "node" ? selectedNodeId : undefined,
          userMessage: content,
          constraints: constraintsSnapshot,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; assistant_message: string; operations: Operation[] }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(
          (json && "message" in json && json.message) || `AI 请求失败（${res.status}）`,
        );
      }

      setMessagesByThreadKey((prev) => ({
        ...prev,
        [activeThreadKey]: [
          ...(prev[activeThreadKey] ?? []),
          {
            role: "assistant",
            content: json.assistant_message,
            operations: json.operations,
            constraints: constraintsSnapshot,
          },
        ],
      }));

      const applyResult = onApplyOperations(json.operations);
      if (!applyResult.ok) {
        throw new Error(applyResult.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI 请求失败";
      setError(message);
    } finally {
      setSending(false);
    }
  }, [constraints, input, mindmapId, onApplyOperations, scope, selectedNodeId]);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">AI</div>
          <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
            <button
              className={`px-2 py-1 text-xs ${
                scope === "global"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-transparent text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              }`}
              onClick={() => setScope("global")}
              type="button"
            >
              全局
            </button>
            <button
              className={`px-2 py-1 text-xs ${
                scope === "node"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-transparent text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              }`}
              onClick={() => setScope("node")}
              type="button"
            >
              节点
            </button>
          </div>
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {scope === "global" ? (
            <>AI 可以修改整张导图。</>
          ) : selectedNodeId ? (
            <>
              目标：{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {selectedNodeLabel}
              </span>
            </>
          ) : (
            <>请选择一个节点以启用节点模式。</>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {historyLoading && messages.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">加载聊天记录中…</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              {scope === "global" ? "让 AI 帮你扩展或优化这张导图。" : "让 AI 帮你扩展该节点子树。"}
            </div>
          ) : (
            messages.map((m, idx) => (
              <div className="flex flex-col gap-1" key={idx}>
                <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                  {getRoleLabel(m.role)}
                </div>
                <div className="text-sm whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {m.content}
                </div>
                {m.role === "assistant" && m.constraints ? (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatAiChatConstraintsSummary(m.constraints)}
                  </div>
                ) : null}
                {m.role === "assistant" && m.operations && m.operations.length > 0
                  ? (() => {
                      const summary = summarizeOperations(m.operations);
                      const move = summary.move + summary.reorder;
                      const shouldShow =
                        summary.add > 0 || summary.rename > 0 || move > 0 || summary.delete > 0;
                      if (!shouldShow) return null;
                      return (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          变更摘要：新增 {summary.add} · 改名 {summary.rename} · 移动 {move} · 删除{" "}
                          {summary.delete}
                        </div>
                      );
                    })()
                  : null}
              </div>
            ))
          )}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
            操作失败：{error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {PROMPT_CHIPS.map((chip) => (
              <button
                className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                disabled={sending || nodeModeBlocked}
                key={chip.label}
                onClick={() => onApplyChip(chip.template)}
                type="button"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/30">
            <summary className="cursor-pointer font-medium text-zinc-700 select-none dark:text-zinc-200">
              高级设置
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                  输出语言
                </div>
                <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
                  <button
                    className={`px-2 py-1 text-[11px] ${
                      constraints.outputLanguage === "zh"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-transparent text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                    onClick={() =>
                      setConstraints((prev) => ({
                        ...prev,
                        outputLanguage: "zh",
                      }))
                    }
                    type="button"
                  >
                    中文
                  </button>
                  <button
                    className={`px-2 py-1 text-[11px] ${
                      constraints.outputLanguage === "en"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-transparent text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                    onClick={() =>
                      setConstraints((prev) => ({
                        ...prev,
                        outputLanguage: "en",
                      }))
                    }
                    type="button"
                  >
                    英文
                  </button>
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                  分支数
                </div>
                <select
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  onChange={(event) =>
                    setConstraints((prev) => ({
                      ...prev,
                      branchCount: Number(event.target.value) as AiChatConstraints["branchCount"],
                    }))
                  }
                  value={constraints.branchCount}
                >
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">深度</div>
                <select
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  onChange={(event) =>
                    setConstraints((prev) => ({
                      ...prev,
                      depth: Number(event.target.value) as AiChatConstraints["depth"],
                    }))
                  }
                  value={constraints.depth}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200">
                  <input
                    checked={constraints.allowMove}
                    className="h-4 w-4"
                    onChange={(event) =>
                      setConstraints((prev) => ({
                        ...prev,
                        allowMove: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  允许移动
                </label>
                <label className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-200">
                  <input
                    checked={constraints.allowDelete}
                    className="h-4 w-4"
                    onChange={(event) =>
                      setConstraints((prev) => ({
                        ...prev,
                        allowDelete: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  允许删除
                </label>
              </div>
            </div>
          </details>

          <textarea
            className="h-24 resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-zinc-800 dark:focus:ring-zinc-700"
            disabled={sending || nodeModeBlocked}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              nodeModeBlocked ? "请选择一个节点以使用节点模式…" : "描述你想新增/修改的内容…"
            }
            value={input}
          />
          <button
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled={!canSend}
            onClick={onSend}
            type="button"
          >
            {sending ? "发送中…" : "发送"}
          </button>
        </div>
      </div>
    </aside>
  );
}
