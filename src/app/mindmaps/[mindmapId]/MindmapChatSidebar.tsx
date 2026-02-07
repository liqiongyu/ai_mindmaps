"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Operation } from "@/lib/mindmap/ops";
import { summarizeOperations } from "@/lib/mindmap/operationSummary";

type ChatScope = "global" | "node";
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  operations?: Operation[] | null;
};

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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScope("global");
    setMessagesByThreadKey({});
    setAttemptedLoadByThreadKey({});
    setLoadingByThreadKey({});
    setInput("");
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
            (json && "message" in json && json.message) ||
              `Failed to load chat history (${res.status})`,
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
        const message = err instanceof Error ? err.message : "Failed to load chat history";
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

  const onSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    if (scope === "node" && !selectedNodeId) return;
    const activeThreadKey = getThreadKey(scope, selectedNodeId);
    if (!activeThreadKey) return;

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
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; assistant_message: string; operations: Operation[] }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(
          (json && "message" in json && json.message) || `AI request failed (${res.status})`,
        );
      }

      setMessagesByThreadKey((prev) => ({
        ...prev,
        [activeThreadKey]: [
          ...(prev[activeThreadKey] ?? []),
          { role: "assistant", content: json.assistant_message, operations: json.operations },
        ],
      }));

      const applyResult = onApplyOperations(json.operations);
      if (!applyResult.ok) {
        throw new Error(applyResult.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed";
      setError(message);
    } finally {
      setSending(false);
    }
  }, [input, mindmapId, onApplyOperations, scope, selectedNodeId]);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Chat</div>
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
              Global
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
              Node
            </button>
          </div>
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {scope === "global" ? (
            <>AI can modify the whole mindmap.</>
          ) : selectedNodeId ? (
            <>
              Target:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {selectedNodeLabel}
              </span>
            </>
          ) : (
            <>Select a node to enable node-scoped chat.</>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {historyLoading && messages.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Loading chat history…</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              {scope === "global"
                ? "Ask the AI to expand or improve this mindmap."
                : "Ask the AI to expand this node subtree."}
            </div>
          ) : (
            messages.map((m, idx) => (
              <div className="flex flex-col gap-1" key={idx}>
                <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                  {m.role}
                </div>
                <div className="text-sm whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {m.content}
                </div>
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
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <textarea
            className="h-24 resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-zinc-800 dark:focus:ring-zinc-700"
            disabled={sending || nodeModeBlocked}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              nodeModeBlocked ? "Select a node to use node chat…" : "Describe what to add / change…"
            }
            value={input}
          />
          <button
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            disabled={!canSend}
            onClick={onSend}
            type="button"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </aside>
  );
}
