"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MindmapChatSidebar } from "./MindmapChatSidebar";
import { MindmapCanvas, type MindmapCanvasHandle } from "./MindmapCanvas";
import { MindmapNodeInspectorModal } from "./MindmapNodeInspectorModal";

import type { MindmapState, Operation } from "@/lib/mindmap/ops";
import { applyOperations } from "@/lib/mindmap/ops";
import { makeMindmapExportFilename } from "@/lib/mindmap/export";
import { sampleMindmapState } from "@/lib/mindmap/sample";
import type { History } from "@/lib/mindmap/history";
import { commitHistory, createHistory, redoHistory, undoHistory } from "@/lib/mindmap/history";
import { MindmapStateSchema } from "@/lib/mindmap/storage";

type EditorActionResult =
  | { ok: true; nextState: MindmapState; nextSelectedNodeId: string | null }
  | { ok: false; message: string };

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

const MAX_HISTORY_PAST = 50;
const NEW_NODE_DEFAULT_TITLE = "New node";

export function MindmapEditor(props: { mode: "demo" } | { mode: "persisted"; mindmapId: string }) {
  const persistedMindmapId = props.mode === "persisted" ? props.mindmapId : null;
  const router = useRouter();
  const [history, setHistory] = useState<History<MindmapState> | null>(() => {
    if (props.mode !== "demo") return null;
    return createHistory(sampleMindmapState);
  });
  const state = history?.present ?? null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    props.mode === "demo" ? sampleMindmapState.rootNodeId : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    props.mode === "demo" ? "idle" : "loading",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deletingMindmap, setDeletingMindmap] = useState(false);
  const [deleteMindmapError, setDeleteMindmapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"png" | "svg" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => new Set());

  const inspectorOpenRef = useRef(inspectorOpen);
  const stateRef = useRef<MindmapState | null>(state);
  const canvasRef = useRef<MindmapCanvasHandle | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const skipNextSaveRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const selectedNode = state && selectedNodeId ? state.nodesById[selectedNodeId] : null;

  const siblingContext = useMemo(() => {
    if (!state) return null;
    if (!selectedNodeId) return null;
    const node = state.nodesById[selectedNodeId];
    if (!node?.parentId) return null;

    const siblings = Object.values(state.nodesById)
      .filter((n) => n.parentId === node.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const index = siblings.findIndex((n) => n.id === selectedNodeId);
    if (index < 0) return null;

    return { parentId: node.parentId, siblings, index };
  }, [selectedNodeId, state]);

  const canAddSibling = siblingContext !== null;
  const canMoveUp = siblingContext ? siblingContext.index > 0 : false;
  const canMoveDown = siblingContext
    ? siblingContext.index < siblingContext.siblings.length - 1
    : false;

  const outdentContext = useMemo(() => {
    if (!state) return null;
    if (!selectedNodeId) return null;
    const node = state.nodesById[selectedNodeId];
    if (!node?.parentId) return null;

    const parent = state.nodesById[node.parentId];
    if (!parent?.parentId) return null;

    return {
      parentId: node.parentId,
      grandParentId: parent.parentId,
      parentOrderIndex: parent.orderIndex,
    };
  }, [selectedNodeId, state]);

  const canIndent = canMoveUp;
  const canOutdent = outdentContext !== null;

  const selectedHasChildren = useMemo(() => {
    if (!state) return false;
    if (!selectedNodeId) return false;
    return Object.values(state.nodesById).some((node) => node.parentId === selectedNodeId);
  }, [selectedNodeId, state]);

  const selectedIsCollapsed = selectedNodeId ? collapsedNodeIds.has(selectedNodeId) : false;
  const canToggleCollapse = Boolean(selectedNodeId) && (selectedIsCollapsed || selectedHasChildren);

  const selectedLabel = useMemo(() => {
    if (!selectedNodeId) return "none";
    return selectedNode?.text ?? selectedNodeId;
  }, [selectedNode?.text, selectedNodeId]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    inspectorOpenRef.current = inspectorOpen;
  }, [inspectorOpen]);

  useEffect(() => {
    if (!state) return;
    setSelectedNodeId((currentSelected) => {
      if (!currentSelected) return state.rootNodeId;
      return state.nodesById[currentSelected] ? currentSelected : state.rootNodeId;
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    setCollapsedNodeIds((current) => {
      if (current.size === 0) return current;
      let changed = false;
      const next = new Set<string>();
      for (const id of current) {
        if (state.nodesById[id]) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [state]);

  useEffect(() => {
    if (!persistedMindmapId) return;

    let cancelled = false;
    setLoadError(null);
    setSaveError(null);
    setShareUrl(null);
    setShareError(null);
    setDeletingMindmap(false);
    setDeleteMindmapError(null);
    setCopied(false);
    setSharing(false);
    setExportError(null);
    setExporting(null);
    setInspectorOpen(false);
    setCollapsedNodeIds(new Set());
    setSaveStatus("loading");
    setHistory(null);
    stateRef.current = null;
    pendingSaveRef.current = false;
    setSelectedNodeId(null);

    (async () => {
      try {
        const res = await fetch(`/api/mindmaps/${persistedMindmapId}`);
        const json = (await res.json().catch(() => null)) as
          | { ok: true; state: unknown }
          | { ok: false; message?: string }
          | null;

        if (!res.ok || !json || json.ok !== true) {
          throw new Error(
            (json && "message" in json && json.message) || `Load failed (${res.status})`,
          );
        }

        const parsed = MindmapStateSchema.safeParse(json.state);
        if (!parsed.success) {
          throw new Error("Loaded mindmap state is invalid");
        }

        if (cancelled) return;
        skipNextSaveRef.current = true;
        stateRef.current = parsed.data;
        setHistory(createHistory(parsed.data));
        setSelectedNodeId(parsed.data.rootNodeId);
        setSaveStatus("saved");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Load failed";
        setLoadError(message);
        setSaveStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [persistedMindmapId]);

  useEffect(() => {
    if (!persistedMindmapId) return;
    if (!state) return;
    if (loadError) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("saving");
    setSaveError(null);
    pendingSaveRef.current = true;
    const seq = (saveSeqRef.current += 1);

    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mindmaps/${persistedMindmapId}/save`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state }),
        });
        const json = (await res.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; message?: string }
          | null;

        if (saveSeqRef.current !== seq) return;
        if (!res.ok || !json || json.ok !== true) {
          throw new Error(
            (json && "message" in json && json.message) || `Save failed (${res.status})`,
          );
        }

        pendingSaveRef.current = false;
        setSaveStatus("saved");
        setSaveError(null);
      } catch (err) {
        if (saveSeqRef.current !== seq) return;
        const message = err instanceof Error ? err.message : "Save failed";
        setSaveStatus("error");
        setSaveError(message);
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [loadError, persistedMindmapId, state]);

  useEffect(() => {
    if (!persistedMindmapId) return;

    const flush = () => {
      if (!pendingSaveRef.current) return;
      const current = stateRef.current;
      if (!current) return;

      const url = `/api/mindmaps/${persistedMindmapId}/save`;
      const body = JSON.stringify({ state: current });

      try {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon?.(url, blob)) {
          return;
        }
      } catch {
        // Ignore and fallback to fetch keepalive.
      }

      try {
        void fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          keepalive: true,
        });
      } catch {
        // Ignore best-effort flush errors.
      }
    };

    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [persistedMindmapId]);

  useEffect(() => {
    if (!inspectorOpenRef.current) return;
    setInspectorOpen(false);
  }, [selectedNodeId]);

  const commit = useCallback((nextState: MindmapState) => {
    stateRef.current = nextState;
    setHistory((current) => {
      if (!current) return createHistory(nextState);
      return commitHistory(current, nextState, MAX_HISTORY_PAST);
    });
  }, []);

  const onUndo = useCallback(() => {
    setHistory((current) => {
      if (!current) return current;
      const next = undoHistory(current);
      if (!next) return current;
      stateRef.current = next.present;
      return next;
    });
  }, []);

  const onRedo = useCallback(() => {
    setHistory((current) => {
      if (!current) return current;
      const next = redoHistory(current);
      if (!next) return current;
      stateRef.current = next.present;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event;
      if (target instanceof HTMLElement) {
        if (target.closest("input, textarea, select, button, a") || target.isContentEditable) {
          return;
        }
      }

      if (
        event.key === "Enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const currentSelectedNodeId = selectedNodeId;
        if (!currentSelectedNodeId) return;
        if (!stateRef.current?.nodesById[currentSelectedNodeId]) return;
        event.preventDefault();
        setInspectorOpen(true);
        return;
      }

      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onRedo, onUndo, selectedNodeId]);

  const apply = useCallback(
    (ops: Operation[], nextSelectedNodeId: string | null): EditorActionResult => {
      try {
        if (!state) {
          return { ok: false, message: "Mindmap not loaded yet" };
        }
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
    if (!state) return;
    const parentId = selectedNodeId ?? state.rootNodeId;
    const title = NEW_NODE_DEFAULT_TITLE;

    const nodeId = globalThis.crypto?.randomUUID?.() ?? `node_${Date.now()}`;
    const result = apply([{ type: "add_node", nodeId, parentId, text: title }], nodeId);
    if (!result.ok) return globalThis.alert(result.message);

    commit(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, commit, selectedNodeId, state]);

  const onAddSibling = useCallback(() => {
    if (!state) return;
    if (!selectedNodeId) return;
    const selected = state.nodesById[selectedNodeId];
    if (!selected) return;
    if (!selected.parentId) {
      return globalThis.alert("Cannot add sibling for root node");
    }

    const title = NEW_NODE_DEFAULT_TITLE;

    const nodeId = globalThis.crypto?.randomUUID?.() ?? `node_${Date.now()}`;
    const result = apply(
      [
        {
          type: "add_node",
          nodeId,
          parentId: selected.parentId,
          text: title,
          index: selected.orderIndex + 1,
        },
      ],
      nodeId,
    );
    if (!result.ok) return globalThis.alert(result.message);

    commit(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, commit, selectedNodeId, state]);

  const onMoveSibling = useCallback(
    (direction: "up" | "down") => {
      if (!state) return;
      if (!selectedNodeId) return;
      const selected = state.nodesById[selectedNodeId];
      if (!selected?.parentId) return;

      const siblings = Object.values(state.nodesById)
        .filter((n) => n.parentId === selected.parentId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const index = siblings.findIndex((n) => n.id === selectedNodeId);
      if (index < 0) return;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return;

      const orderedChildIds = siblings.map((n) => n.id);
      [orderedChildIds[index], orderedChildIds[targetIndex]] = [
        orderedChildIds[targetIndex],
        orderedChildIds[index],
      ];

      const result = apply(
        [{ type: "reorder_children", parentId: selected.parentId, orderedChildIds }],
        selectedNodeId,
      );
      if (!result.ok) return globalThis.alert(result.message);

      commit(result.nextState);
      setSelectedNodeId(result.nextSelectedNodeId);
    },
    [apply, commit, selectedNodeId, state],
  );

  const onIndent = useCallback(() => {
    if (!state) return;
    if (!selectedNodeId) return;
    const selected = state.nodesById[selectedNodeId];
    if (!selected?.parentId) return;

    const siblings = Object.values(state.nodesById)
      .filter((n) => n.parentId === selected.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const index = siblings.findIndex((n) => n.id === selectedNodeId);
    if (index <= 0) return;

    const newParentId = siblings[index - 1].id;
    const result = apply(
      [{ type: "move_node", nodeId: selectedNodeId, newParentId }],
      selectedNodeId,
    );
    if (!result.ok) return globalThis.alert(result.message);

    commit(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, commit, selectedNodeId, state]);

  const onOutdent = useCallback(() => {
    if (!state) return;
    if (!selectedNodeId) return;
    const selected = state.nodesById[selectedNodeId];
    if (!selected?.parentId) return;

    const parent = state.nodesById[selected.parentId];
    if (!parent?.parentId) return;

    const result = apply(
      [
        {
          type: "move_node",
          nodeId: selectedNodeId,
          newParentId: parent.parentId,
          index: parent.orderIndex + 1,
        },
      ],
      selectedNodeId,
    );
    if (!result.ok) return globalThis.alert(result.message);

    commit(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, commit, selectedNodeId, state]);

  const onToggleCollapse = useCallback(() => {
    if (!state) return;
    if (!selectedNodeId) return;
    const hasChildren = Object.values(state.nodesById).some(
      (node) => node.parentId === selectedNodeId,
    );

    setCollapsedNodeIds((current) => {
      if (current.has(selectedNodeId)) {
        const next = new Set(current);
        next.delete(selectedNodeId);
        return next;
      }
      if (!hasChildren) return current;
      const next = new Set(current);
      next.add(selectedNodeId);
      return next;
    });
  }, [selectedNodeId, state]);

  const onOpenInspector = useCallback(() => {
    if (!selectedNodeId) return;
    if (!stateRef.current?.nodesById[selectedNodeId]) return;
    setInspectorOpen(true);
  }, [selectedNodeId]);

  const onDelete = useCallback(() => {
    if (!state) return;
    if (!selectedNodeId) return;
    if (selectedNodeId === state.rootNodeId) {
      return globalThis.alert("Cannot delete root node");
    }

    const ok = globalThis.confirm("Delete selected node (and its subtree)?");
    if (!ok) return;

    const result = apply([{ type: "delete_node", nodeId: selectedNodeId }], state.rootNodeId);
    if (!result.ok) return globalThis.alert(result.message);

    commit(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, commit, selectedNodeId, state]);

  const applyAIOperations = useCallback(
    (operations: Operation[]) => {
      const current = stateRef.current;
      if (!current) {
        return { ok: false as const, message: "Mindmap not loaded yet" };
      }

      try {
        const next = applyOperations(current, operations);
        commit(next);
        setSelectedNodeId((currentSelected) => {
          if (!currentSelected) return next.rootNodeId;
          return next.nodesById[currentSelected] ? currentSelected : next.rootNodeId;
        });
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to apply operations";
        return { ok: false as const, message };
      }
    },
    [commit],
  );

  const onSaveNodeDetails = useCallback(
    async ({ nodeId, title, notes }: { nodeId: string; title: string; notes: string }) => {
      const current = stateRef.current;
      if (!current) {
        return { ok: false as const, message: "Mindmap not loaded yet" };
      }

      const node = current.nodesById[nodeId];
      if (!node) {
        return { ok: false as const, message: "Node not found" };
      }

      const nextTitle = title.trim();
      if (!nextTitle) {
        return { ok: false as const, message: "Title is required" };
      }

      const operations: Operation[] = [];
      if (nextTitle !== node.text) {
        operations.push({ type: "rename_node", nodeId, text: nextTitle });
      }

      const currentNotes = node.notes ?? "";
      if (notes !== currentNotes) {
        operations.push({ type: "update_notes", nodeId, notes });
      }

      if (operations.length === 0) {
        return { ok: true as const };
      }

      try {
        const next = applyOperations(current, operations);
        commit(next);
        setSelectedNodeId(next.nodesById[nodeId] ? nodeId : next.rootNodeId);
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to apply node edits";
        return { ok: false as const, message };
      }
    },
    [commit],
  );

  const onShare = useCallback(async () => {
    if (!persistedMindmapId) return;
    setSharing(true);
    setShareError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/mindmaps/${persistedMindmapId}/share`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; publicSlug: string }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(
          (json && "message" in json && json.message) || `Share failed (${res.status})`,
        );
      }

      const url = new URL(`/public/${json.publicSlug}`, window.location.origin).toString();
      setShareUrl(url);

      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        // Clipboard not available; user can copy manually.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed";
      setShareError(message);
    } finally {
      setSharing(false);
    }
  }, [persistedMindmapId]);

  const onDeleteMindmap = useCallback(async () => {
    if (!persistedMindmapId) return;
    const confirmed = window.confirm("Delete this mindmap? This cannot be undone.");
    if (!confirmed) return;

    setDeletingMindmap(true);
    setDeleteMindmapError(null);
    try {
      const res = await fetch(`/api/mindmaps/${persistedMindmapId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
        throw new Error(
          (json && "message" in json && json.message) || `Delete failed (${res.status})`,
        );
      }

      router.push("/mindmaps");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setDeleteMindmapError(message);
    } finally {
      setDeletingMindmap(false);
    }
  }, [persistedMindmapId, router]);

  const onExport = useCallback(
    async (format: "png" | "svg") => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setExportError("Canvas not ready yet");
        return;
      }

      setExporting(format);
      setExportError(null);
      try {
        const fileName = makeMindmapExportFilename({ format, mindmapId: persistedMindmapId });
        const result =
          format === "png" ? await canvas.exportPng(fileName) : await canvas.exportSvg(fileName);
        if (!result.ok) {
          throw new Error(result.message);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setExportError(message);
      } finally {
        setExporting(null);
      }
    },
    [persistedMindmapId],
  );

  const statusLabel = useMemo(() => {
    if (props.mode === "demo") return "Demo";
    switch (saveStatus) {
      case "loading":
        return "Loading…";
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Error";
      case "idle":
      default:
        return "Idle";
    }
  }, [props.mode, saveStatus]);

  const canUndo = history ? history.past.length > 0 : false;
  const canRedo = history ? history.future.length > 0 : false;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">MindMaps AI</div>
          <div className="text-xs text-zinc-500">
            <span className="mr-2">{statusLabel}</span>
            Selected: {selectedLabel}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canUndo}
            onClick={onUndo}
            title="Undo (⌘Z / Ctrl+Z)"
            type="button"
          >
            Undo
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canRedo}
            onClick={onRedo}
            title="Redo (⌘⇧Z / Ctrl+Y)"
            type="button"
          >
            Redo
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state}
            onClick={onAddChild}
            type="button"
          >
            Add child
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canAddSibling}
            onClick={onAddSibling}
            type="button"
          >
            Add sibling
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canIndent}
            onClick={onIndent}
            type="button"
          >
            Indent
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canOutdent}
            onClick={onOutdent}
            type="button"
          >
            Outdent
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canMoveUp}
            onClick={() => onMoveSibling("up")}
            type="button"
          >
            Move up
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canMoveDown}
            onClick={() => onMoveSibling("down")}
            type="button"
          >
            Move down
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !canToggleCollapse}
            onClick={onToggleCollapse}
            type="button"
          >
            {selectedIsCollapsed ? "Expand" : "Collapse"}
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !selectedNodeId}
            onClick={onOpenInspector}
            type="button"
          >
            Details
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !selectedNodeId || selectedNodeId === state.rootNodeId}
            onClick={onDelete}
            type="button"
          >
            Delete
          </button>
          {persistedMindmapId ? (
            <button
              className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              disabled={!state || sharing || deletingMindmap}
              onClick={onShare}
              type="button"
            >
              {sharing ? "Sharing…" : shareUrl ? "Refresh link" : "Share"}
            </button>
          ) : null}
          {persistedMindmapId ? (
            <button
              className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-950/50 dark:text-red-200 dark:hover:bg-red-950/30"
              disabled={!state || deletingMindmap}
              onClick={onDeleteMindmap}
              type="button"
            >
              {deletingMindmap ? "Deleting…" : "Delete mindmap"}
            </button>
          ) : null}
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || exporting !== null}
            onClick={() => onExport("png")}
            type="button"
          >
            {exporting === "png" ? "Exporting…" : "Export PNG"}
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || exporting !== null}
            onClick={() => onExport("svg")}
            type="button"
          >
            {exporting === "svg" ? "Exporting…" : "Export SVG"}
          </button>
        </div>
      </header>

      {loadError ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-10">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
            Failed to load mindmap: {loadError}
          </div>
          <Link className="text-sm underline" href="/mindmaps">
            Back to mindmaps
          </Link>
        </div>
      ) : !state ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-10">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Loading…</div>
        </div>
      ) : (
        <div className="flex flex-1">
          <div className="flex min-h-0 flex-1 flex-col">
            {deleteMindmapError ? (
              <div className="border-b border-zinc-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-red-950/30 dark:text-red-200">
                Delete failed: {deleteMindmapError}
              </div>
            ) : null}
            {shareError ? (
              <div className="border-b border-zinc-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-red-950/30 dark:text-red-200">
                Share failed: {shareError}
              </div>
            ) : null}
            {shareUrl ? (
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a className="underline" href={shareUrl} rel="noreferrer" target="_blank">
                    {shareUrl}
                  </a>
                  <button
                    className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                      } catch {
                        setCopied(false);
                      }
                    }}
                    type="button"
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
            ) : null}
            {saveError ? (
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-red-200">
                Save failed: {saveError}
              </div>
            ) : null}
            {exportError ? (
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-red-200">
                Export failed: {exportError}
              </div>
            ) : null}
            <div className="relative min-h-0 flex-1">
              <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-md border border-zinc-200 bg-white/90 px-2 py-1 text-[11px] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300">
                Drag: move node (visual only; not persisted yet)
              </div>
              <MindmapCanvas
                ref={canvasRef}
                collapsedNodeIds={collapsedNodeIds}
                editable
                onSelectNodeId={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                state={state}
              />
            </div>
          </div>
          {persistedMindmapId ? (
            <MindmapChatSidebar
              mindmapId={persistedMindmapId}
              onApplyOperations={applyAIOperations}
              selectedNodeId={selectedNodeId}
              selectedNodeLabel={selectedLabel}
            />
          ) : null}
        </div>
      )}

      {inspectorOpen && selectedNodeId && selectedNode ? (
        <MindmapNodeInspectorModal
          initialNotes={selectedNode.notes}
          initialTitle={selectedNode.text}
          nodeId={selectedNodeId}
          onClose={() => setInspectorOpen(false)}
          onSave={onSaveNodeDetails}
        />
      ) : null}
    </main>
  );
}
