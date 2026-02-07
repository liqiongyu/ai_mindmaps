"use client";

import { useCallback, useMemo, useState } from "react";

import type { Operation } from "@/lib/mindmap/ops";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function MindmapChatSidebar({
  mindmapId,
  onApplyOperations,
}: {
  mindmapId: string;
  onApplyOperations: (operations: Operation[]) => { ok: true } | { ok: false; message: string };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  const onSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;

    setSending(true);
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mindmapId, scope: "global", userMessage: content }),
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

      setMessages((prev) => [...prev, { role: "assistant", content: json.assistant_message }]);

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
  }, [input, mindmapId, onApplyOperations]);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="text-sm font-medium">Global chat</div>
        <div className="text-xs text-zinc-500">AI updates the mindmap via ops</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
          {messages.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Ask the AI to expand or improve this mindmap.
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
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what to add / change…"
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
