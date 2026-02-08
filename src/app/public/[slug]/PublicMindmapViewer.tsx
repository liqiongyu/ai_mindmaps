"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MindmapCanvas, type MindmapCanvasHandle } from "@/app/mindmaps/[mindmapId]/MindmapCanvas";
import { getMindmapNodeBreadcrumb } from "@/lib/mindmap/breadcrumb";
import type { MindmapState } from "@/lib/mindmap/ops";
import { SafeMarkdown } from "@/lib/ui/markdown";
import { uiFeedback } from "@/lib/ui/feedback";

export function PublicMindmapViewer({
  title,
  updatedAt,
  state,
}: {
  title: string;
  updatedAt: string;
  state: MindmapState;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(state.rootNodeId);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const canvasRef = useRef<MindmapCanvasHandle | null>(null);
  const appliedInitialDeepLinkRef = useRef(false);

  const updatedLabel = useMemo(() => {
    try {
      return new Date(updatedAt).toLocaleString();
    } catch {
      return updatedAt;
    }
  }, [updatedAt]);

  const selectedNode = selectedNodeId ? state.nodesById[selectedNodeId] : null;

  const breadcrumb = useMemo(() => {
    if (!selectedNodeId) return [];
    return getMindmapNodeBreadcrumb(state, selectedNodeId);
  }, [selectedNodeId, state]);

  const updateUrlNodeParam = useCallback((nodeId: string | null) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("nodeId");
      if (nodeId) {
        url.searchParams.set("node", nodeId);
      } else {
        url.searchParams.delete("node");
      }
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }, []);

  const onSelectNodeId = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      setMobileDrawerOpen(Boolean(nodeId));
      updateUrlNodeParam(nodeId);
    },
    [updateUrlNodeParam],
  );

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
    setSelectedNodeId(null);
    updateUrlNodeParam(null);
  }, [updateUrlNodeParam]);

  useEffect(() => {
    if (appliedInitialDeepLinkRef.current) return;
    appliedInitialDeepLinkRef.current = true;

    try {
      const url = new URL(window.location.href);
      const nodeId = url.searchParams.get("node") ?? url.searchParams.get("nodeId");
      if (!nodeId) return;
      if (!state.nodesById[nodeId]) return;

      requestAnimationFrame(() => {
        setSelectedNodeId(nodeId);
        setMobileDrawerOpen(true);
        updateUrlNodeParam(nodeId);

        const focusOnce = () => {
          const result = canvasRef.current?.focusNode({ nodeId });
          if (!result || !result.ok) {
            requestAnimationFrame(() => canvasRef.current?.focusNode({ nodeId }));
          }
        };
        requestAnimationFrame(() => requestAnimationFrame(focusOnce));
      });
    } catch {
      // ignore
    }
  }, [state.nodesById, updateUrlNodeParam]);

  const copySelectedNodeLink = useCallback(async () => {
    if (!selectedNodeId) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("nodeId");
      url.searchParams.set("node", selectedNodeId);
      await navigator.clipboard.writeText(url.toString());
      uiFeedback.enqueue({ type: "success", message: "已复制当前节点链接" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "复制失败";
      uiFeedback.enqueue({ type: "error", message });
    }
  }, [selectedNodeId]);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-zinc-500">更新于：{updatedLabel}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!selectedNodeId}
            onClick={() => void copySelectedNodeLink()}
            type="button"
          >
            复制当前节点链接
          </button>
          <Link className="underline" href="/">
            首页
          </Link>
          <Link className="underline" href="/login">
            登录
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          <MindmapCanvas
            onSelectNodeId={onSelectNodeId}
            ref={canvasRef}
            selectedNodeId={selectedNodeId}
            state={state}
          />
        </div>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="text-sm font-medium">节点备注</div>
            {selectedNode ? (
              <nav
                aria-label="节点路径"
                className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-zinc-500"
              >
                {breadcrumb.map((item, idx) => (
                  <span className="flex items-center gap-1" key={item.id}>
                    <button
                      className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                      onClick={() => onSelectNodeId(item.id)}
                      type="button"
                    >
                      {item.text}
                    </button>
                    {idx < breadcrumb.length - 1 ? <span>/</span> : null}
                  </span>
                ))}
              </nav>
            ) : (
              <div className="mt-1 text-xs text-zinc-500">点击节点查看备注。</div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            {selectedNode ? (
              <>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedNode.text}
                </div>
                {selectedNode.notes?.trim() ? (
                  <SafeMarkdown
                    className="mt-3 text-sm text-zinc-700 dark:text-zinc-200"
                    markdown={selectedNode.notes}
                  />
                ) : (
                  <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                    该节点暂无备注。
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">未选择节点。</div>
            )}
          </div>
        </aside>
      </div>

      {mobileDrawerOpen && selectedNode ? (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button
            aria-label="关闭备注抽屉"
            className="absolute inset-0 bg-black/30"
            onClick={closeMobileDrawer}
            type="button"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[65vh] overflow-hidden rounded-t-xl bg-white shadow-2xl dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="text-sm font-medium">节点备注</div>
              <button
                className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                onClick={closeMobileDrawer}
                type="button"
              >
                关闭
              </button>
            </div>
            <div className="min-h-0 overflow-auto px-4 py-3">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {selectedNode.text}
              </div>
              {breadcrumb.length > 0 ? (
                <nav
                  aria-label="节点路径"
                  className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-zinc-500"
                >
                  {breadcrumb.map((item, idx) => (
                    <span className="flex items-center gap-1" key={item.id}>
                      <button
                        className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
                        onClick={() => onSelectNodeId(item.id)}
                        type="button"
                      >
                        {item.text}
                      </button>
                      {idx < breadcrumb.length - 1 ? <span>/</span> : null}
                    </span>
                  ))}
                </nav>
              ) : null}

              {selectedNode.notes?.trim() ? (
                <SafeMarkdown
                  className="mt-3 text-sm text-zinc-700 dark:text-zinc-200"
                  markdown={selectedNode.notes}
                />
              ) : (
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                  该节点暂无备注。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
