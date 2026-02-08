"use client";

import { useEffect, useRef } from "react";

export function MindmapSaveConflictModal({
  busy,
  error,
  onLoadLatest,
  onOverwrite,
  onSaveAsCopy,
}: {
  busy: boolean;
  error: string | null;
  onLoadLatest: () => void;
  onOverwrite: () => void;
  onSaveAsCopy: () => void;
}) {
  const saveAsCopyButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handle = requestAnimationFrame(() => saveAsCopyButtonRef.current?.focus());
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(event) => event.stopPropagation()}
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="text-sm font-medium">检测到版本冲突</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            检测到版本冲突，已阻止覆盖保存。该导图在其他会话已更新，已暂停自动保存。
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
              操作失败：{error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              className="flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-950/50 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/30"
              disabled={busy}
              onClick={onOverwrite}
              type="button"
            >
              覆盖保存（谨慎）
            </button>
            <button
              className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={busy}
              onClick={onLoadLatest}
              type="button"
            >
              加载最新
            </button>
            <button
              className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={busy}
              onClick={onSaveAsCopy}
              ref={saveAsCopyButtonRef}
              type="button"
            >
              {busy ? "另存中…" : "另存为副本（推荐）"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
