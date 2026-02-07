"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { MindmapCanvas } from "@/app/mindmaps/[mindmapId]/MindmapCanvas";
import { getMindmapNodeBreadcrumb } from "@/lib/mindmap/breadcrumb";
import type { MindmapState } from "@/lib/mindmap/ops";

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

  const breadcrumbLabel = useMemo(() => {
    if (breadcrumb.length === 0) return "";
    return breadcrumb.map((item) => item.text).join(" / ");
  }, [breadcrumb]);

  const onSelectNodeId = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setMobileDrawerOpen(Boolean(nodeId));
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
    setSelectedNodeId(null);
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-zinc-500">Updated: {updatedLabel}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/">
            Home
          </Link>
          <Link className="underline" href="/login">
            Log in
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          <MindmapCanvas
            onSelectNodeId={onSelectNodeId}
            selectedNodeId={selectedNodeId}
            state={state}
          />
        </div>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="text-sm font-medium">节点备注</div>
            {selectedNode ? (
              <div className="mt-1 text-xs text-zinc-500">{breadcrumbLabel}</div>
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
                <div className="mt-3 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                  {selectedNode.notes?.trim() ? selectedNode.notes : "该节点暂无备注。"}
                </div>
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
            aria-label="Close notes drawer"
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
              {breadcrumbLabel ? (
                <div className="mt-1 text-xs text-zinc-500">{breadcrumbLabel}</div>
              ) : null}
              <div className="mt-3 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                {selectedNode.notes?.trim() ? selectedNode.notes : "该节点暂无备注。"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
