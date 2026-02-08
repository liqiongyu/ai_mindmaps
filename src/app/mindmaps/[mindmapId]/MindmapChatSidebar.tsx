"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AiChatConstraints } from "@/lib/ai/chat";
import {
  DEFAULT_AI_CHAT_CONSTRAINTS,
  formatAiChatConstraintsSummary,
} from "@/lib/ai/chatConstraints";
import type { Operation } from "@/lib/mindmap/ops";
import { summarizeOperations } from "@/lib/mindmap/operationSummary";
import { track } from "@/lib/telemetry/client";
import { uiFeedback } from "@/lib/ui/feedback";

type ChatScope = "global" | "node";
type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  operations?: Operation[] | null;
  constraints?: AiChatConstraints;
  provider?: string | null;
  model?: string | null;
  createdAt?: string;
  rollbackToPresentId?: number;
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

type MindmapChatSidebarBaseProps = {
  mindmapId: string;
  selectedNodeId: string | null;
  selectedNodeLabel: string;
  chatPersistenceAvailable?: boolean;
  onApplyOperations: (
    operations: Operation[],
  ) => { ok: true; rollbackToPresentId?: number } | { ok: false; message: string };
  onRollbackToPresentId?: (
    targetPresentId: number,
  ) => { ok: true } | { ok: false; message: string };
};

type MindmapChatSidebarDesktopProps = MindmapChatSidebarBaseProps & {
  mode?: "desktop";
};

type MindmapChatSidebarDrawerProps = MindmapChatSidebarBaseProps & {
  mode: "drawer";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MindmapChatSidebarProps = MindmapChatSidebarDesktopProps | MindmapChatSidebarDrawerProps;

export function MindmapChatSidebar(props: MindmapChatSidebarProps) {
  const { mindmapId, selectedNodeId, selectedNodeLabel, onApplyOperations, onRollbackToPresentId } =
    props;
  const drawerMode = props.mode === "drawer";
  const drawerOpen = props.mode === "drawer" ? props.open : false;
  const onDrawerOpenChange = props.mode === "drawer" ? props.onOpenChange : null;
  const chatPersistenceAvailable = props.chatPersistenceAvailable ?? true;

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
  const [copiedOpsKey, setCopiedOpsKey] = useState<string | null>(null);

  useEffect(() => {
    setScope("global");
    setMessagesByThreadKey({});
    setAttemptedLoadByThreadKey({});
    setLoadingByThreadKey({});
    setInput("");
    setConstraints(DEFAULT_AI_CHAT_CONSTRAINTS);
    setError(null);
    setSending(false);
    setCopiedOpsKey(null);
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
                id: string;
                role: ChatMessage["role"];
                content: string;
                operations?: Operation[] | null;
                provider?: string | null;
                model?: string | null;
                createdAt?: string;
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
                id: m.id,
                role: m.role,
                content: m.content,
                operations:
                  m.role === "assistant" && Array.isArray(m.operations) ? m.operations : null,
                provider: m.provider ?? null,
                model: m.model ?? null,
                createdAt: m.createdAt,
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
      const base = prev.trimEnd();
      if (base.trim().length === 0) return template;
      return `${base}\n${template}`;
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
      track("ai_request_sent", {
        mindmapId,
        scope,
        selectedNodeId: scope === "node" ? selectedNodeId : null,
      });

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
        | {
            ok: true;
            assistant_message: string;
            operations: Operation[];
            provider?: string | null;
            model?: string | null;
            persistence?: { chatPersisted?: boolean };
          }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(
          (json && "message" in json && json.message) || `AI 请求失败（${res.status}）`,
        );
      }

      const applyResult = onApplyOperations(json.operations);
      if (!applyResult.ok) {
        throw new Error(applyResult.message);
      }

      track("ai_ops_applied", {
        mindmapId,
        scope,
        operationsCount: json.operations.length,
      });

      const summary = summarizeOperations(json.operations);
      const move = summary.move + summary.reorder;
      const shouldShowSummary =
        summary.add > 0 || summary.rename > 0 || move > 0 || summary.delete > 0;
      if (shouldShowSummary) {
        uiFeedback.enqueue({
          type: "success",
          title: "AI 已应用改动",
          message: `变更摘要：新增 ${summary.add} · 改名 ${summary.rename} · 移动 ${move} · 删除 ${summary.delete}。改动已应用到画布，正在保存到云端…`,
        });
      }

      if (json.persistence && json.persistence.chatPersisted === false) {
        uiFeedback.enqueue({
          type: "warning",
          title: "聊天记录未持久化",
          message: "聊天记录暂未持久化，刷新后可能丢失。",
        });
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
            provider: json.provider ?? null,
            model: json.model ?? null,
            createdAt: new Date().toISOString(),
            rollbackToPresentId: applyResult.rollbackToPresentId,
          },
        ],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI 请求失败";
      setError(message);
      uiFeedback.enqueue({
        type: "error",
        title: "AI 请求失败",
        message,
        actions: content
          ? [
              {
                label: "重试",
                onClick: () => setInput(content),
              },
            ]
          : [],
      });
    } finally {
      setSending(false);
    }
  }, [constraints, input, mindmapId, onApplyOperations, scope, selectedNodeId]);

  useEffect(() => {
    if (!drawerMode) return;
    if (!drawerOpen) return;
    if (!onDrawerOpenChange) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDrawerOpenChange(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerMode, drawerOpen, onDrawerOpenChange]);

  const sidebar = (
    <aside
      id="mindmap-ai-panel"
      className={
        drawerMode
          ? drawerOpen
            ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full shrink-0 flex-col rounded-t-xl border border-zinc-200 bg-white shadow-lg lg:static lg:z-auto lg:max-h-none lg:w-96 lg:rounded-none lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:border-l lg:shadow-none dark:border-zinc-800 dark:bg-zinc-950"
            : "hidden w-96 shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-950"
          : "flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }
    >
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">AI</div>
          <div className="flex items-center gap-2">
            {drawerMode && drawerOpen && onDrawerOpenChange ? (
              <button
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                onClick={() => onDrawerOpenChange(false)}
                type="button"
              >
                关闭
              </button>
            ) : null}
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
        {!chatPersistenceAvailable ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            聊天记录暂未持久化，刷新后可能丢失。
          </div>
        ) : null}
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
              <div className="flex flex-col gap-1" key={m.id ?? idx}>
                <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                  {getRoleLabel(m.role)}
                </div>
                {m.role === "assistant"
                  ? (() => {
                      const providerModel = [m.provider, m.model].filter(Boolean).join(" / ");
                      const createdAt = m.createdAt
                        ? (() => {
                            try {
                              return new Date(m.createdAt).toLocaleString();
                            } catch {
                              return m.createdAt;
                            }
                          })()
                        : "";

                      if (!providerModel && !createdAt) return null;
                      return (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {providerModel}
                          {providerModel && createdAt ? " · " : null}
                          {createdAt}
                        </div>
                      );
                    })()
                  : null}
                <div className="text-sm whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {m.content}
                </div>
                {m.role === "assistant" && m.constraints ? (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatAiChatConstraintsSummary(m.constraints)}
                  </div>
                ) : null}
                {m.role === "assistant" && Array.isArray(m.operations) ? (
                  <details className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950/30">
                    <summary className="cursor-pointer font-medium text-zinc-700 select-none dark:text-zinc-200">
                      操作详情（ops）
                    </summary>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        disabled={sending}
                        onClick={async () => {
                          const key = m.id ?? String(idx);
                          try {
                            await navigator.clipboard.writeText(
                              JSON.stringify(m.operations, null, 2),
                            );
                            setCopiedOpsKey(key);
                            setTimeout(() => {
                              setCopiedOpsKey((current) => (current === key ? null : current));
                            }, 1500);
                          } catch {
                            uiFeedback.enqueue({
                              type: "error",
                              title: "复制失败",
                              message: "无法写入剪贴板，请手动复制。",
                            });
                          }
                        }}
                        type="button"
                      >
                        {copiedOpsKey === (m.id ?? String(idx)) ? "已复制" : "复制 ops"}
                      </button>
                    </div>
                    <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-zinc-200 bg-white p-2 text-[11px] leading-relaxed text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                      {JSON.stringify(m.operations, null, 2)}
                    </pre>
                  </details>
                ) : null}
                {m.role === "assistant" &&
                typeof m.rollbackToPresentId === "number" &&
                onRollbackToPresentId ? (
                  <button
                    className="mt-1 w-fit rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-950/50 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/30"
                    disabled={sending}
                    onClick={async () => {
                      const targetPresentId = m.rollbackToPresentId;
                      if (typeof targetPresentId !== "number") return;
                      const confirmed = await uiFeedback.confirm({
                        title: "回滚确认",
                        message: "确定回滚到此条 AI 前？你可以使用撤销/重做恢复。",
                        confirmLabel: "回滚",
                        cancelLabel: "取消",
                        tone: "danger",
                      });
                      if (!confirmed) return;
                      setError(null);
                      const result = onRollbackToPresentId(targetPresentId);
                      if (!result.ok) {
                        setError(result.message);
                        uiFeedback.enqueue({
                          type: "error",
                          title: "回滚失败",
                          message: result.message,
                        });
                      }
                    }}
                    type="button"
                  >
                    回滚到此条 AI 前
                  </button>
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
                {constraints.allowDelete ? (
                  <div className="text-[11px] text-red-700 dark:text-red-200">
                    注意：允许删除属于危险操作。
                  </div>
                ) : null}
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

  if (!drawerMode) {
    return sidebar;
  }

  if (!onDrawerOpenChange) return null;

  return (
    <>
      {drawerOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => onDrawerOpenChange(false)}
        />
      ) : null}
      {sidebar}
    </>
  );
}
