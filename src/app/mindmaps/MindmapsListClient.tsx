"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { uiFeedback } from "@/lib/ui/feedback";

type MindmapListItem = {
  id: string;
  title: string;
  updatedAt: string;
  isPublic: boolean;
  publicSlug: string | null;
};

type MindmapsListResponse = {
  ok: true;
  items: MindmapListItem[];
  nextCursor: string | null;
  total: number;
};

const PAGE_LIMIT = 20;

export function MindmapsListClient({
  initialItems,
  initialNextCursor,
  initialTotal,
  initialQuery,
}: {
  initialItems: MindmapListItem[];
  initialNextCursor: string | null;
  initialTotal: number;
  initialQuery: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [items, setItems] = useState<MindmapListItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [total, setTotal] = useState<number>(initialTotal);
  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchIdRef = useRef(0);

  useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
    setTotal(initialTotal);
    setQuery(initialQuery);
  }, [initialItems, initialNextCursor, initialQuery, initialTotal]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const pageCount = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.ceil(items.length / PAGE_LIMIT);
  }, [items.length]);

  const fetchPage = async (args: {
    q: string;
    cursor: string | null;
    mode: "replace" | "append";
  }) => {
    const fetchId = (lastFetchIdRef.current += 1);
    const q = args.q.trim();

    const params = new URLSearchParams();
    params.set("limit", String(PAGE_LIMIT));
    if (args.cursor) params.set("cursor", args.cursor);
    if (q) params.set("q", q);

    const res = await fetch(`/api/mindmaps?${params.toString()}`);
    const json = (await res.json().catch(() => null)) as unknown;

    if (!res.ok || !json || typeof json !== "object" || (json as { ok?: unknown }).ok !== true) {
      const message =
        json && typeof json === "object"
          ? typeof (json as Record<string, unknown>).detail === "string"
            ? String((json as Record<string, unknown>).detail)
            : "message" in json && typeof json.message === "string"
              ? json.message
              : `加载失败（${res.status}）`
          : `加载失败（${res.status}）`;
      throw new Error(message);
    }

    if (fetchId !== lastFetchIdRef.current) return;

    const payload = json as MindmapsListResponse;
    if (args.mode === "replace") {
      setItems(payload.items);
    } else {
      setItems((prev) => [...prev, ...payload.items]);
    }
    setNextCursor(payload.nextCursor);
    setTotal(payload.total);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          {total === 0 ? "暂无导图" : `已加载第 ${pageCount} 页，共 ${total} 条。`}
        </div>
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

      <div className="flex flex-col gap-2">
        <label className="text-sm text-zinc-600 dark:text-zinc-300" htmlFor="mindmaps-search">
          搜索
        </label>
        <input
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-600"
          id="mindmaps-search"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setError(null);

            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
              setSearching(true);
              void fetchPage({ q: next, cursor: null, mode: "replace" })
                .catch((err) => {
                  const message = err instanceof Error ? err.message : "加载失败";
                  setError(message);
                })
                .finally(() => setSearching(false));
            }, 300);
          }}
          placeholder="输入关键词搜索导图标题"
          value={query}
        />
        {searching ? <div className="text-xs text-zinc-500">搜索中…</div> : null}
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

      {items.length === 0 ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200">
          {query.trim() ? "未找到匹配导图，试试其他关键词。" : "还没有导图。新建一个开始吧。"}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((m) => (
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

                      setItems((prev) => prev.filter((item) => item.id !== m.id));
                      setTotal((prev) => Math.max(0, prev - 1));
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

      {nextCursor ? (
        <button
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          disabled={loadingMore || searching}
          onClick={() => {
            if (!nextCursor) return;
            setLoadingMore(true);
            setError(null);
            void fetchPage({ q: query, cursor: nextCursor, mode: "append" })
              .catch((err) => {
                const message = err instanceof Error ? err.message : "加载失败";
                setError(message);
              })
              .finally(() => setLoadingMore(false));
          }}
          type="button"
        >
          {loadingMore ? "加载中…" : "加载更多"}
        </button>
      ) : null}
    </section>
  );
}
