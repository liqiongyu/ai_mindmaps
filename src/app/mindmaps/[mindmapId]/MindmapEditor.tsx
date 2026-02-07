"use client";

import { useCallback, useMemo, useState } from "react";

import { MindmapCanvas } from "./MindmapCanvas";

import type { MindmapState, Operation } from "@/lib/mindmap/ops";
import { applyOperations } from "@/lib/mindmap/ops";
import { sampleMindmapState } from "@/lib/mindmap/sample";

type EditorActionResult =
  | { ok: true; nextState: MindmapState; nextSelectedNodeId: string | null }
  | { ok: false; message: string };

export function MindmapEditor() {
  const [state, setState] = useState<MindmapState>(sampleMindmapState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(state.rootNodeId);

  const selectedNode = selectedNodeId ? state.nodesById[selectedNodeId] : null;

  const selectedLabel = useMemo(() => {
    if (!selectedNodeId) return "none";
    return selectedNode?.text ?? selectedNodeId;
  }, [selectedNode?.text, selectedNodeId]);

  const apply = useCallback(
    (ops: Operation[], nextSelectedNodeId: string | null): EditorActionResult => {
      try {
        const nextState = applyOperations(state, ops);
        return { ok: true, nextState, nextSelectedNodeId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { ok: false, message };
      }
    },
    [state],
  );

  const onAddChild = useCallback(() => {
    const parentId = selectedNodeId ?? state.rootNodeId;
    const text = globalThis.prompt("New node title");
    const title = text?.trim();
    if (!title) return;

    const nodeId = globalThis.crypto?.randomUUID?.() ?? `node_${Date.now()}`;
    const result = apply([{ type: "add_node", nodeId, parentId, text: title }], nodeId);
    if (!result.ok) return globalThis.alert(result.message);

    setState(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, selectedNodeId, state.rootNodeId]);

  const onRename = useCallback(() => {
    if (!selectedNodeId) return;
    const current = state.nodesById[selectedNodeId];
    if (!current) return;

    const text = globalThis.prompt("Rename node", current.text);
    const title = text?.trim();
    if (!title) return;

    const result = apply(
      [{ type: "rename_node", nodeId: selectedNodeId, text: title }],
      selectedNodeId,
    );
    if (!result.ok) return globalThis.alert(result.message);

    setState(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, selectedNodeId, state.nodesById]);

  const onDelete = useCallback(() => {
    if (!selectedNodeId) return;
    if (selectedNodeId === state.rootNodeId) {
      return globalThis.alert("Cannot delete root node");
    }

    const ok = globalThis.confirm("Delete selected node (and its subtree)?");
    if (!ok) return;

    const result = apply([{ type: "delete_node", nodeId: selectedNodeId }], state.rootNodeId);
    if (!result.ok) return globalThis.alert(result.message);

    setState(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, selectedNodeId, state.rootNodeId]);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">MindMaps AI</div>
          <div className="text-xs text-zinc-500">Selected: {selectedLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            onClick={onAddChild}
            type="button"
          >
            Add child
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!selectedNodeId}
            onClick={onRename}
            type="button"
          >
            Rename
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!selectedNodeId || selectedNodeId === state.rootNodeId}
            onClick={onDelete}
            type="button"
          >
            Delete
          </button>
        </div>
      </header>
      <MindmapCanvas
        onSelectNodeId={setSelectedNodeId}
        selectedNodeId={selectedNodeId}
        state={state}
      />
    </main>
  );
}
