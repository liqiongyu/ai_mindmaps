"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MindmapCanvas } from "@/app/mindmaps/[mindmapId]/MindmapCanvas";
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

  const updatedLabel = useMemo(() => {
    try {
      return new Date(updatedAt).toLocaleString();
    } catch {
      return updatedAt;
    }
  }, [updatedAt]);

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

      <div className="min-h-0 flex-1">
        <MindmapCanvas
          onSelectNodeId={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
          state={state}
        />
      </div>
    </main>
  );
}
