"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MindmapCanvas } from "./MindmapCanvas";

import type { MindmapState, Operation } from "@/lib/mindmap/ops";
import { applyOperations } from "@/lib/mindmap/ops";
import { sampleMindmapState } from "@/lib/mindmap/sample";
import { MindmapStateSchema } from "@/lib/mindmap/storage";

type EditorActionResult =
  | { ok: true; nextState: MindmapState; nextSelectedNodeId: string | null }
  | { ok: false; message: string };

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

export function MindmapEditor(props: { mode: "demo" } | { mode: "persisted"; mindmapId: string }) {
  const persistedMindmapId = props.mode === "persisted" ? props.mindmapId : null;
  const [state, setState] = useState<MindmapState | null>(
    props.mode === "demo" ? sampleMindmapState : null,
  );
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
  const [copied, setCopied] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const skipNextSaveRef = useRef(false);

  const selectedNode = state && selectedNodeId ? state.nodesById[selectedNodeId] : null;

  const selectedLabel = useMemo(() => {
    if (!selectedNodeId) return "none";
    return selectedNode?.text ?? selectedNodeId;
  }, [selectedNode?.text, selectedNodeId]);

  useEffect(() => {
    if (!persistedMindmapId) return;

    let cancelled = false;
    setLoadError(null);
    setSaveError(null);
    setShareUrl(null);
    setShareError(null);
    setCopied(false);
    setSharing(false);
    setSaveStatus("loading");
    setState(null);
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
        setState(parsed.data);
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
    const text = globalThis.prompt("New node title");
    const title = text?.trim();
    if (!title) return;

    const nodeId = globalThis.crypto?.randomUUID?.() ?? `node_${Date.now()}`;
    const result = apply([{ type: "add_node", nodeId, parentId, text: title }], nodeId);
    if (!result.ok) return globalThis.alert(result.message);

    setState(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, selectedNodeId, state]);

  const onRename = useCallback(() => {
    if (!state) return;
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
  }, [apply, selectedNodeId, state]);

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

    setState(result.nextState);
    setSelectedNodeId(result.nextSelectedNodeId);
  }, [apply, selectedNodeId, state]);

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
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state}
            onClick={onAddChild}
            type="button"
          >
            Add child
          </button>
          <button
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            disabled={!state || !selectedNodeId}
            onClick={onRename}
            type="button"
          >
            Rename
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
              disabled={!state || sharing}
              onClick={onShare}
              type="button"
            >
              {sharing ? "Sharing…" : shareUrl ? "Refresh link" : "Share"}
            </button>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-10">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200">
            Failed to load mindmap: {loadError}
          </div>
          <Link className="text-sm underline" href="/mindmaps">
            Back to mindmaps
          </Link>
        </div>
      ) : !state ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-10">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Loading…</div>
        </div>
      ) : (
        <>
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
          <MindmapCanvas
            onSelectNodeId={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            state={state}
          />
        </>
      )}
    </main>
  );
}
