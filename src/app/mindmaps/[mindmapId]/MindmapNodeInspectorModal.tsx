"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SaveResult = { ok: true } | { ok: false; message: string };

export function MindmapNodeInspectorModal({
  nodeId,
  initialTitle,
  initialNotes,
  onClose,
  onSave,
}: {
  nodeId: string;
  initialTitle: string;
  initialNotes: string | null;
  onClose: () => void;
  onSave: (args: {
    nodeId: string;
    title: string;
    notes: string;
  }) => Promise<SaveResult> | SaveResult;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setNotes(initialNotes ?? "");
    setSaving(false);
    setError(null);
  }, [initialNotes, initialTitle, nodeId]);

  useEffect(() => {
    const input = titleRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [nodeId]);

  const onSaveClick = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await onSave({ nodeId, title, notes });
      if (!result.ok) {
        throw new Error(result.message);
      }
      setSaving(false);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      setError(message);
      setSaving(false);
    }
  }, [nodeId, notes, onClose, onSave, title]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "Enter") {
        event.preventDefault();
        void onSaveClick();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, onSaveClick]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-medium">节点详情</div>
            <div className="text-xs text-zinc-500">编辑标题与备注。保存：⌘⏎ / Ctrl+⏎</div>
          </div>
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">标题</div>
            <input
              className="rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-zinc-800 dark:focus:ring-zinc-700"
              disabled={saving}
              onChange={(e) => setTitle(e.target.value)}
              ref={titleRef}
              value={title}
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">备注</div>
            <textarea
              className="h-40 resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-zinc-800 dark:focus:ring-zinc-700"
              disabled={saving}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="支持 Markdown（目前以纯文本展示）…"
              value={notes}
            />
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
              保存失败：{error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              取消
            </button>
            <button
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={saving}
              onClick={() => void onSaveClick()}
              type="button"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
