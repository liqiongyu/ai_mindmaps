"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { uiFeedback } from "@/lib/ui/feedback";

type MindmapListItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
  publicSlug: string | null;
};

export function MindmapsListClient({ initialMindmaps }: { initialMindmaps: MindmapListItem[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mindmaps = useMemo(() => initialMindmaps, [initialMindmaps]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">{mindmaps.length} 个导图</div>
        <button
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              const res = await fetch("/api/mindmaps", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({}),
              });
              const json = (await res.json().catch(() => null)) as
                | { ok: true; mindmapId: string }
                | { ok: false; message?: string }
                | null;

              if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
                throw new Error(
                  (json && "message" in json && json.message) || `创建失败（${res.status}）`,
                );
              }

              router.push(`/mindmaps/${json.mindmapId}`);
              router.refresh();
            } catch (err) {
              const message = err instanceof Error ? err.message : "创建失败";
              setError(message);
            } finally {
              setSubmitting(false);
            }
          }}
          type="button"
        >
          {submitting ? "创建中…" : "新建导图"}
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
          操作失败：{error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 text-sm">
        <Link className="underline" href="/mindmaps/demo">
          打开演示编辑器
        </Link>
      </div>

      {mindmaps.length === 0 ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200">
          还没有导图。新建一个开始吧。
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {mindmaps.map((m) => (
            <li className="flex items-center justify-between gap-3 px-4 py-3" key={m.id}>
              <div className="flex flex-col gap-0.5">
                <Link className="font-medium underline" href={`/mindmaps/${m.id}`}>
                  {m.title}
                </Link>
                <div className="text-xs text-zinc-500">
                  更新于：{new Date(m.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {m.isPublic && m.publicSlug ? (
                  <Link className="text-xs underline" href={`/public/${m.publicSlug}`}>
                    查看公开页
                  </Link>
                ) : null}
                <button
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-950/50 dark:text-red-200 dark:hover:bg-red-950/30"
                  disabled={submitting || deletingId === m.id}
                  onClick={async () => {
                    const confirmed = await uiFeedback.confirm({
                      title: "删除导图？",
                      message: `删除“${m.title}”？这将永久删除该导图。`,
                      confirmLabel: "删除",
                      cancelLabel: "取消",
                      tone: "danger",
                    });
                    if (!confirmed) return;

                    setDeletingId(m.id);
                    setError(null);
                    try {
                      const res = await fetch(`/api/mindmaps/${m.id}`, { method: "DELETE" });
                      const json = (await res.json().catch(() => null)) as
                        | { ok: true }
                        | { ok: false; message?: string }
                        | null;

                      if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
                        throw new Error(
                          (json && "message" in json && json.message) ||
                            `删除失败（${res.status}）`,
                        );
                      }

                      router.refresh();
                    } catch (err) {
                      const message = err instanceof Error ? err.message : "删除失败";
                      setError(message);
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  type="button"
                >
                  {deletingId === m.id ? "删除中…" : "删除"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
