"use client";

import { useEffect, useMemo } from "react";

function formatRelativeTime(updatedAt: string): string {
  const ms = new Date(updatedAt).getTime();
  if (!Number.isFinite(ms)) return "";
  const deltaMs = Date.now() - ms;
  const deltaSeconds = Math.max(0, Math.floor(deltaMs / 1000));
  if (deltaSeconds < 10) return "刚刚";
  if (deltaSeconds < 60) return `${deltaSeconds} 秒前`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes} 分钟前`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours} 小时前`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} 天前`;
}

export type TryDraftImportAction = "import" | "blank" | "discard" | null;

export function TryDraftImportModal({
  action,
  error,
  onClose,
  onImport,
  onStartBlank,
  onDiscard,
  updatedAt,
}: {
  action: TryDraftImportAction;
  error: string | null;
  onClose: () => void;
  onImport: () => void;
  onStartBlank: () => void;
  onDiscard: () => void;
  updatedAt: string;
}) {
  const relativeUpdatedAt = useMemo(() => formatRelativeTime(updatedAt), [updatedAt]);
  const subtitle = relativeUpdatedAt ? `更新于 ${relativeUpdatedAt}` : "";
  const busy = action !== null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (!busy) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-medium">检测到试玩草稿</div>
            {subtitle ? <div className="text-xs text-zinc-500">{subtitle}</div> : null}
          </div>
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            稍后
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="text-sm text-zinc-700 dark:text-zinc-200">
            你可以将试玩草稿导入到云端，继续编辑并使用 AI。
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
              导入失败：{error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={busy}
              onClick={onImport}
              type="button"
            >
              {action === "import" ? "导入中…" : "导入到我的导图（推荐）"}
            </button>
            <button
              className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={busy}
              onClick={onStartBlank}
              type="button"
            >
              {action === "blank" ? "创建中…" : "继续从空白开始"}
            </button>
            <button
              className="flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-950/50 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/30"
              disabled={busy}
              onClick={onDiscard}
              type="button"
            >
              {action === "discard" ? "丢弃中…" : "丢弃草稿"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
