"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MindmapChatSidebar } from "./MindmapChatSidebar";
import { MindmapCanvas, type MindmapCanvasHandle } from "./MindmapCanvas";
import { MindmapNodeInspectorModal } from "./MindmapNodeInspectorModal";

import { TryDraftImportModal, type TryDraftImportAction } from "@/app/try/TryDraftImportModal";
import type { MindmapState, Operation } from "@/lib/mindmap/ops";
import { applyOperations } from "@/lib/mindmap/ops";
import { makeMindmapExportFilename } from "@/lib/mindmap/export";
import { getMindmapEditorKeyAction } from "@/lib/mindmap/keybindings";
import { sampleMindmapState } from "@/lib/mindmap/sample";
import type { History } from "@/lib/mindmap/history";
import {
  commitHistory,
  createHistory,
  redoHistory,
  travelHistoryToPresentId,
  undoHistory,
} from "@/lib/mindmap/history";
import {
  deriveOperationHighlights,
  type OperationHighlightKind,
} from "@/lib/mindmap/operationSummary";
import { MindmapStateSchema } from "@/lib/mindmap/storage";
import { MindmapUiStateSchema, type MindmapViewport } from "@/lib/mindmap/uiState";
import {
  parseTryDraftJson,
  stringifyTryDraft,
  TRY_DRAFT_STORAGE_KEY,
} from "@/lib/mindmap/tryDraft";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uiFeedback } from "@/lib/ui/feedback";

type EditorActionResult =
  | { ok: true; nextState: MindmapState; nextSelectedNodeId: string | null }
  | { ok: false; message: string };

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

const MAX_HISTORY_PAST = 50;
const NEW_NODE_DEFAULT_TITLE = "新节点";

const TOOLBAR_GROUP_CLASS_NAME =
  "flex items-center gap-1 rounded-md border border-zinc-200 bg-white/80 p-1 dark:border-zinc-800 dark:bg-zinc-950/50";
const TOOLBAR_GROUP_LABEL_CLASS_NAME =
  "select-none px-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400";
const TOOLBAR_BUTTON_CLASS_NAME =
  "rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-900";
const TOOLBAR_MENU_SUMMARY_CLASS_NAME =
  "flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border border-zinc-200 bg-white/80 text-sm text-zinc-700 select-none hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-200 dark:hover:bg-zinc-900 [&::-webkit-details-marker]:hidden";
const TOOLBAR_MENU_PANEL_CLASS_NAME =
  "absolute right-0 z-20 mt-2 w-48 rounded-md border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";
const TOOLBAR_MENU_ITEM_DANGER_CLASS_NAME =
  "w-full rounded-md px-2 py-2 text-left text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-200 dark:hover:bg-red-950/30";

type MindmapEditorProps =
  | { mode: "demo" }
  | { mode: "try" }
  | { mode: "persisted"; mindmapId: string };

export function MindmapEditor(props: MindmapEditorProps) {
  const persistedMindmapId = props.mode === "persisted" ? props.mindmapId : null;
  const router = useRouter();

  const initialTryDraft = useMemo(() => {
    if (props.mode !== "try") return null;
    try {
      const raw = localStorage.getItem(TRY_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      return parseTryDraftJson(raw);
    } catch {
      return null;
    }
  }, [props.mode]);

  const [history, setHistory] = useState<History<MindmapState> | null>(() => {
    if (props.mode === "persisted") return null;
    if (props.mode === "try") {
      return createHistory(initialTryDraft?.state ?? sampleMindmapState);
    }
    return createHistory(sampleMindmapState);
  });
  const state = history?.present ?? null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => {
    if (props.mode === "persisted") return null;
    if (props.mode === "demo") return sampleMindmapState.rootNodeId;

    const initialState = initialTryDraft?.state ?? sampleMindmapState;
    const desired = initialTryDraft?.ui.selectedNodeId;
    if (desired && initialState.nodesById[desired]) return desired;
    return initialState.rootNodeId;
  });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [highlightByNodeId, setHighlightByNodeId] = useState<
    Record<string, OperationHighlightKind>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() => {
    if (props.mode === "demo") return "idle";
    if (props.mode === "try") return initialTryDraft ? "saved" : "idle";
    return "loading";
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uiSaveError, setUiSaveError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [stoppingShare, setStoppingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deletingMindmap, setDeletingMindmap] = useState(false);
  const [deleteMindmapError, setDeleteMindmapError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"png" | "svg" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [positionSaveError, setPositionSaveError] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(() => {
    if (props.mode !== "try") return new Set();
    if (!initialTryDraft) return new Set();
    const validIds = initialTryDraft.ui.collapsedNodeIds.filter((id) =>
      Boolean(initialTryDraft.state.nodesById[id]),
    );
    return new Set(validIds);
  });
  const [viewport, setViewport] = useState<MindmapViewport | null>(() => {
    if (props.mode !== "try") return null;
    return initialTryDraft?.ui.viewport ?? null;
  });
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);
  const [tryDraftImportOpen, setTryDraftImportOpen] = useState(false);
  const [tryDraftImportDismissed, setTryDraftImportDismissed] = useState(false);
  const [tryDraftImportAction, setTryDraftImportAction] = useState<TryDraftImportAction>(null);
  const [tryDraftImportError, setTryDraftImportError] = useState<string | null>(null);

  const tryDraftPersistenceDisabledRef = useRef(false);
  const inspectorOpenRef = useRef(inspectorOpen);
  const historyRef = useRef<History<MindmapState> | null>(history);
  const stateRef = useRef<MindmapState | null>(state);
  const canvasRef = useRef<MindmapCanvasHandle | null>(null);
  const canvasHotkeysScopeRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const skipNextSaveRef = useRef(false);
  const persistedSaveInFlightRef = useRef(false);
  const persistedSaveQueuedBodyRef = useRef<string | null>(null);
  const uiSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiSaveSeqRef = useRef(0);
  const skipNextUiSaveRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const pendingUiSaveRef = useRef(false);
  const uiStateJsonRef = useRef<string | null>(null);
  const tryDraftJsonRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dangerMenuRef = useRef<HTMLDetailsElement | null>(null);

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
    if (!selectedNodeId) return "无";
    return selectedNode?.text ?? selectedNodeId;
  }, [selectedNode?.text, selectedNodeId]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    inspectorOpenRef.current = inspectorOpen;
  }, [inspectorOpen]);

  useEffect(() => {
    setChatDrawerOpen(false);
  }, [persistedMindmapId]);

  useEffect(() => {
    if (props.mode !== "try") return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        setAuthedUserId(null);
        return;
      }
      setAuthedUserId(data.user.id);
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setAuthedUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      authSubscription.subscription.unsubscribe();
    };
  }, [props.mode]);

  useEffect(() => {
    if (props.mode !== "try") return;
    if (!authedUserId) return;
    if (!initialTryDraft) return;
    if (tryDraftImportDismissed) return;
    if (tryDraftImportOpen) return;

    setTryDraftImportError(null);
    setTryDraftImportAction(null);
    setTryDraftImportOpen(true);
  }, [authedUserId, initialTryDraft, props.mode, tryDraftImportDismissed, tryDraftImportOpen]);

  useEffect(() => {
    if (!state) return;
    setSelectedNodeId((currentSelected) => {
      if (!currentSelected) return state.rootNodeId;
      return state.nodesById[currentSelected] ? currentSelected : state.rootNodeId;
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    setEditingNodeId((currentEditing) => {
      if (!currentEditing) return currentEditing;
      return state.nodesById[currentEditing] ? currentEditing : null;
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
    setUiSaveError(null);
    setShareUrl(null);
    setShareError(null);
    setDeletingMindmap(false);
    setDeleteMindmapError(null);
    setCopied(false);
    setSharing(false);
    setStoppingShare(false);
    setExportError(null);
    setExporting(null);
    setPositionSaveError(null);
    setInspectorOpen(false);
    setCollapsedNodeIds(new Set());
    setViewport(null);
    setSaveStatus("loading");
    setHistory(null);
    historyRef.current = null;
    stateRef.current = null;
    saveSeqRef.current = 0;
    uiSaveSeqRef.current = 0;
    pendingSaveRef.current = false;
    persistedSaveInFlightRef.current = false;
    persistedSaveQueuedBodyRef.current = null;
    pendingUiSaveRef.current = false;
    uiStateJsonRef.current = null;
    setSelectedNodeId(null);

    (async () => {
      try {
        const res = await fetch(`/api/mindmaps/${persistedMindmapId}`);
        const json = (await res.json().catch(() => null)) as
          | {
              ok: true;
              state: unknown;
              ui?: unknown;
              mindmap?: { isPublic?: boolean; publicSlug?: string | null };
            }
          | { ok: false; message?: string }
          | null;

        if (!res.ok || !json || json.ok !== true) {
          throw new Error(
            (json && "message" in json && json.message) || `加载失败（${res.status}）`,
          );
        }

        const parsed = MindmapStateSchema.safeParse(json.state);
        if (!parsed.success) {
          throw new Error("导图数据格式无效");
        }

        if (cancelled) return;
        const isPublic = Boolean(json.mindmap?.isPublic);
        const publicSlug =
          typeof json.mindmap?.publicSlug === "string" ? json.mindmap.publicSlug : null;
        if (isPublic && publicSlug) {
          setShareUrl(new URL(`/public/${publicSlug}`, window.location.origin).toString());
        } else {
          setShareUrl(null);
        }
        setCopied(false);
        skipNextSaveRef.current = true;
        skipNextUiSaveRef.current = true;
        stateRef.current = parsed.data;
        const uiParsed = MindmapUiStateSchema.safeParse(json.ui ?? {});
        const ui = uiParsed.success ? uiParsed.data : null;
        const nextHistory = createHistory(parsed.data);
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        const nextCollapsedNodeIds =
          ui?.collapsedNodeIds.filter((id) => Boolean(parsed.data.nodesById[id])) ?? [];
        const nextSelectedNodeId =
          ui?.selectedNodeId && parsed.data.nodesById[ui.selectedNodeId]
            ? ui.selectedNodeId
            : parsed.data.rootNodeId;
        setCollapsedNodeIds(new Set(nextCollapsedNodeIds));
        setViewport(ui?.viewport ?? null);
        setSelectedNodeId(nextSelectedNodeId);
        setSaveStatus("saved");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "加载失败";
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
    if (loadError) return;
    if (!stateRef.current) return;

    if (skipNextUiSaveRef.current) {
      skipNextUiSaveRef.current = false;
      return;
    }

    if (uiSaveTimerRef.current) {
      clearTimeout(uiSaveTimerRef.current);
    }

    setUiSaveError(null);
    pendingUiSaveRef.current = true;
    const seq = (uiSaveSeqRef.current += 1);

    const currentState = stateRef.current;
    const collapsedNodeIdsToSave = Array.from(collapsedNodeIds)
      .filter((id) => Boolean(currentState.nodesById[id]))
      .sort();
    const selectedNodeIdToSave =
      selectedNodeId && currentState.nodesById[selectedNodeId]
        ? selectedNodeId
        : currentState.rootNodeId;
    const uiPayload = {
      collapsedNodeIds: collapsedNodeIdsToSave,
      selectedNodeId: selectedNodeIdToSave,
      viewport,
    };

    uiStateJsonRef.current = JSON.stringify(uiPayload);

    uiSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mindmaps/${persistedMindmapId}/ui`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: uiStateJsonRef.current,
        });
        const json = (await res.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; message?: string }
          | null;

        if (uiSaveSeqRef.current !== seq) return;
        if (!res.ok || !json || json.ok !== true) {
          throw new Error(
            (json && "message" in json && json.message) || `视图状态保存失败（${res.status}）`,
          );
        }

        pendingUiSaveRef.current = false;
        setUiSaveError(null);
      } catch (err) {
        if (uiSaveSeqRef.current !== seq) return;
        const message = err instanceof Error ? err.message : "视图状态保存失败";
        setUiSaveError(message);
      }
    }, 500);

    return () => {
      if (uiSaveTimerRef.current) clearTimeout(uiSaveTimerRef.current);
    };
  }, [collapsedNodeIds, loadError, persistedMindmapId, selectedNodeId, viewport]);

  const flushPersistedSave = useCallback(async () => {
    if (!persistedMindmapId) return;
    if (persistedSaveInFlightRef.current) return;
    const body = persistedSaveQueuedBodyRef.current;
    if (!body) return;

    persistedSaveQueuedBodyRef.current = null;
    persistedSaveInFlightRef.current = true;
    const requestId = (saveSeqRef.current += 1);

    try {
      const res = await fetch(`/api/mindmaps/${persistedMindmapId}/save`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error((json && "message" in json && json.message) || `保存失败（${res.status}）`);
      }

      if (saveSeqRef.current === requestId && !persistedSaveQueuedBodyRef.current) {
        pendingSaveRef.current = false;
        setSaveStatus("saved");
        setSaveError(null);
      }
    } catch (err) {
      if (saveSeqRef.current === requestId && !persistedSaveQueuedBodyRef.current) {
        pendingSaveRef.current = false;
        const message = err instanceof Error ? err.message : "保存失败";
        setSaveStatus("error");
        setSaveError(message);
      }
    } finally {
      persistedSaveInFlightRef.current = false;
      if (persistedSaveQueuedBodyRef.current) {
        void flushPersistedSave();
      }
    }
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

    saveTimerRef.current = setTimeout(async () => {
      persistedSaveQueuedBodyRef.current = JSON.stringify({ state });
      void flushPersistedSave();
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [flushPersistedSave, loadError, persistedMindmapId, state]);

  useEffect(() => {
    if (!persistedMindmapId) return;

    const flush = () => {
      if (!pendingUiSaveRef.current) return;
      const json = uiStateJsonRef.current;
      if (!json) return;

      const url = `/api/mindmaps/${persistedMindmapId}/ui`;

      try {
        const blob = new Blob([json], { type: "application/json" });
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
          body: json,
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
    if (props.mode !== "try") return;
    if (!state) return;
    if (tryDraftPersistenceDisabledRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("saving");
    setSaveError(null);
    const seq = (saveSeqRef.current += 1);
    pendingSaveRef.current = true;

    try {
      const draft = {
        state,
        updatedAt: new Date().toISOString(),
        ui: {
          collapsedNodeIds: Array.from(collapsedNodeIds),
          selectedNodeId,
          viewport,
        },
      };
      tryDraftJsonRef.current = stringifyTryDraft(draft);
    } catch (err) {
      pendingSaveRef.current = false;
      tryDraftJsonRef.current = null;
      const message = err instanceof Error ? err.message : "本地保存失败";
      setSaveStatus("error");
      setSaveError(message);
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      if (saveSeqRef.current !== seq) return;
      const json = tryDraftJsonRef.current;
      if (!json) return;

      try {
        localStorage.setItem(TRY_DRAFT_STORAGE_KEY, json);
        pendingSaveRef.current = false;
        setSaveStatus("saved");
        setSaveError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "本地保存失败";
        setSaveStatus("error");
        setSaveError(message);
      }
    }, 250);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [collapsedNodeIds, props.mode, selectedNodeId, state, viewport]);

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
    if (props.mode !== "try") return;

    const flush = () => {
      if (tryDraftPersistenceDisabledRef.current) return;
      if (!pendingSaveRef.current) return;
      const json = tryDraftJsonRef.current;
      if (!json) return;
      try {
        localStorage.setItem(TRY_DRAFT_STORAGE_KEY, json);
        pendingSaveRef.current = false;
      } catch {
        // Ignore best-effort flush errors.
      }
    };

    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [props.mode]);

  useEffect(() => {
    if (!inspectorOpenRef.current) return;
    setInspectorOpen(false);
  }, [selectedNodeId]);

  useEffect(() => {
    return () => {
      if (!highlightTimerRef.current) return;
      clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const commit = useCallback((nextState: MindmapState) => {
    stateRef.current = nextState;
    const current = historyRef.current;
    const next = current
      ? commitHistory(current, nextState, MAX_HISTORY_PAST)
      : createHistory(nextState);
    historyRef.current = next;
    setHistory(next);
  }, []);

  const onUndo = useCallback(() => {
    const current = historyRef.current;
    if (!current) return;
    const next = undoHistory(current);
    if (!next) return;
    historyRef.current = next;
    stateRef.current = next.present;
    setHistory(next);
  }, []);

  const onRedo = useCallback(() => {
    const current = historyRef.current;
    if (!current) return;
    const next = redoHistory(current);
    if (!next) return;
    historyRef.current = next;
    stateRef.current = next.present;
    setHistory(next);
  }, []);

  const apply = useCallback(
    (ops: Operation[], nextSelectedNodeId: string | null): EditorActionResult => {
      const current = stateRef.current;
      if (!current) {
        return { ok: false, message: "导图尚未加载" };
      }

      try {
        const nextState = applyOperations(current, ops);
        return { ok: true, nextState, nextSelectedNodeId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "未知错误";
        return { ok: false, message };
      }
    },
    [],
  );

  const onRequestEditNodeId = useCallback((nodeId: string) => {
    const current = stateRef.current;
    if (!current?.nodesById[nodeId]) return;
    setInspectorOpen(false);
    setSelectedNodeId(nodeId);
    setEditingNodeId(nodeId);
  }, []);

  const onCancelEditNodeId = useCallback((nodeId: string) => {
    setEditingNodeId((current) => (current === nodeId ? null : current));
  }, []);

  const onCommitNodeTitle = useCallback(
    ({ nodeId, title }: { nodeId: string; title: string }): { ok: true } | { ok: false } => {
      const current = stateRef.current;
      if (!current) return { ok: false };
      const node = current.nodesById[nodeId];
      if (!node) return { ok: false };

      const nextTitle = title.trim();
      if (!nextTitle) return { ok: false };

      if (nextTitle === node.text) {
        setEditingNodeId((currentEditing) => (currentEditing === nodeId ? null : currentEditing));
        return { ok: true };
      }

      try {
        const next = applyOperations(current, [{ type: "rename_node", nodeId, text: nextTitle }]);
        commit(next);
        setSelectedNodeId(nodeId);
        setEditingNodeId((currentEditing) => (currentEditing === nodeId ? null : currentEditing));
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "重命名失败";
        uiFeedback.enqueue({ type: "error", title: "重命名失败", message });
        return { ok: false };
      }
    },
    [commit],
  );

  const addChildForNode = useCallback(
    (parentId: string) => {
      const current = stateRef.current;
      if (!current?.nodesById[parentId]) return null;

      const nodeId = globalThis.crypto?.randomUUID?.() ?? `node_${Date.now()}`;
      const result = apply(
        [{ type: "add_node", nodeId, parentId, text: NEW_NODE_DEFAULT_TITLE }],
        nodeId,
      );
      if (!result.ok) {
        uiFeedback.enqueue({ type: "error", title: "新增子节点失败", message: result.message });
        return null;
      }

      commit(result.nextState);
      setSelectedNodeId(nodeId);
      setEditingNodeId(nodeId);
      return nodeId;
    },
    [apply, commit],
  );

  const addSiblingForNode = useCallback(
    (siblingId: string) => {
      const current = stateRef.current;
      const sibling = current?.nodesById[siblingId];
      if (!sibling?.parentId) return null;

      const nodeId = globalThis.crypto?.randomUUID?.() ?? `node_${Date.now()}`;
      const result = apply(
        [
          {
            type: "add_node",
            nodeId,
            parentId: sibling.parentId,
            text: NEW_NODE_DEFAULT_TITLE,
            index: sibling.orderIndex + 1,
          },
        ],
        nodeId,
      );
      if (!result.ok) {
        uiFeedback.enqueue({ type: "error", title: "新增同级失败", message: result.message });
        return null;
      }

      commit(result.nextState);
      setSelectedNodeId(nodeId);
      setEditingNodeId(nodeId);
      return nodeId;
    },
    [apply, commit],
  );

  const deleteNodeById = useCallback(
    (nodeId: string) => {
      const current = stateRef.current;
      if (!current) return;
      if (nodeId === current.rootNodeId) return;

      const result = apply([{ type: "delete_node", nodeId }], current.rootNodeId);
      if (!result.ok) {
        uiFeedback.enqueue({ type: "error", title: "删除节点失败", message: result.message });
        return;
      }

      commit(result.nextState);
      setSelectedNodeId(result.nextSelectedNodeId);
      setEditingNodeId(null);
    },
    [apply, commit],
  );

  const onAddChild = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    const parentId = selectedNodeId ?? current.rootNodeId;
    addChildForNode(parentId);
  }, [addChildForNode, selectedNodeId]);

  const onAddSibling = useCallback(() => {
    if (!selectedNodeId) return;
    addSiblingForNode(selectedNodeId);
  }, [addSiblingForNode, selectedNodeId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event;
      if (target instanceof HTMLElement) {
        if (target.closest("input, textarea, select, button, a") || target.isContentEditable) {
          return;
        }
      }

      if (editingNodeId) return;

      const action = getMindmapEditorKeyAction(event);
      if (!action) return;

      if (action === "add_sibling") {
        const scopeEl = canvasHotkeysScopeRef.current;
        if (!scopeEl || !(event.target instanceof HTMLElement) || !scopeEl.contains(event.target)) {
          return;
        }
      }

      const current = stateRef.current;
      const currentSelectedNodeId = selectedNodeId;

      switch (action) {
        case "undo": {
          event.preventDefault();
          onUndo();
          return;
        }
        case "redo": {
          event.preventDefault();
          onRedo();
          return;
        }
        case "edit_title": {
          if (!currentSelectedNodeId) return;
          if (!current?.nodesById[currentSelectedNodeId]) return;
          event.preventDefault();
          onRequestEditNodeId(currentSelectedNodeId);
          return;
        }
        case "add_child": {
          if (!current) return;
          event.preventDefault();
          const parentId = currentSelectedNodeId ?? current.rootNodeId;
          addChildForNode(parentId);
          return;
        }
        case "add_sibling": {
          event.preventDefault();
          if (!currentSelectedNodeId) return;
          addSiblingForNode(currentSelectedNodeId);
          return;
        }
        case "delete_selected": {
          event.preventDefault();
          if (!currentSelectedNodeId) return;
          deleteNodeById(currentSelectedNodeId);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    addChildForNode,
    addSiblingForNode,
    deleteNodeById,
    editingNodeId,
    onRedo,
    onRequestEditNodeId,
    onUndo,
    selectedNodeId,
  ]);

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
      if (!result.ok) {
        uiFeedback.enqueue({ type: "error", title: "调整顺序失败", message: result.message });
        return;
      }

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
    if (!result.ok) {
      uiFeedback.enqueue({ type: "error", title: "移动节点失败", message: result.message });
      return;
    }

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
    if (!result.ok) {
      uiFeedback.enqueue({ type: "error", title: "移动节点失败", message: result.message });
      return;
    }

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
    setEditingNodeId(null);
    setInspectorOpen(true);
  }, [selectedNodeId]);

  const onDelete = useCallback(() => {
    if (!selectedNodeId) return;
    deleteNodeById(selectedNodeId);
  }, [deleteNodeById, selectedNodeId]);

  const rollbackToPresentId = useCallback((targetPresentId: number) => {
    const current = historyRef.current;
    if (!current) {
      return { ok: false as const, message: "导图尚未加载" };
    }

    const next = travelHistoryToPresentId(current, targetPresentId);
    if (!next) {
      return {
        ok: false as const,
        message: "无法回滚：目标历史已被清理（撤销栈上限）",
      };
    }

    historyRef.current = next;
    stateRef.current = next.present;
    setHistory(next);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightByNodeId({});

    return { ok: true as const };
  }, []);

  const applyAIOperations = useCallback(
    (operations: Operation[]) => {
      const current = stateRef.current;
      const currentHistory = historyRef.current;
      if (!current || !currentHistory) {
        return { ok: false as const, message: "导图尚未加载" };
      }

      if (operations.length === 0) {
        return { ok: true as const };
      }

      const rollbackToPresentId = currentHistory.presentId;

      try {
        const next = applyOperations(current, operations);
        commit(next);
        const derived = deriveOperationHighlights(operations);
        const filtered: Record<string, OperationHighlightKind> = {};
        for (const [nodeId, kind] of Object.entries(derived)) {
          if (next.nodesById[nodeId]) {
            filtered[nodeId] = kind;
          }
        }
        if (highlightTimerRef.current) {
          clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = null;
        }
        setHighlightByNodeId(filtered);
        if (Object.keys(filtered).length > 0) {
          highlightTimerRef.current = setTimeout(() => {
            setHighlightByNodeId({});
          }, 3500);
        }
        setSelectedNodeId((currentSelected) => {
          if (!currentSelected) return next.rootNodeId;
          return next.nodesById[currentSelected] ? currentSelected : next.rootNodeId;
        });
        return { ok: true as const, rollbackToPresentId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "应用改动失败";
        return { ok: false as const, message };
      }
    },
    [commit],
  );

  const onSaveNodeDetails = useCallback(
    async ({ nodeId, title, notes }: { nodeId: string; title: string; notes: string }) => {
      const current = stateRef.current;
      if (!current) {
        return { ok: false as const, message: "导图尚未加载" };
      }

      const node = current.nodesById[nodeId];
      if (!node) {
        return { ok: false as const, message: "未找到该节点" };
      }

      const nextTitle = title.trim();
      if (!nextTitle) {
        return { ok: false as const, message: "标题不能为空" };
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
        const message = err instanceof Error ? err.message : "保存失败";
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
        throw new Error((json && "message" in json && json.message) || `分享失败（${res.status}）`);
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
      const message = err instanceof Error ? err.message : "分享失败";
      setShareError(message);
    } finally {
      setSharing(false);
    }
  }, [persistedMindmapId]);

  const onStopSharing = useCallback(async () => {
    if (!persistedMindmapId) return;
    if (!shareUrl) return;

    const confirmed = await uiFeedback.confirm({
      title: "停止分享？",
      message: "停止分享后，旧链接将无法访问。继续？",
      confirmLabel: "停止分享",
      cancelLabel: "取消",
      tone: "danger",
    });
    if (!confirmed) return;

    setStoppingShare(true);
    setShareError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/mindmaps/${persistedMindmapId}/share`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        throw new Error(
          (json && "message" in json && json.message) || `停止分享失败（${res.status}）`,
        );
      }

      setShareUrl(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "停止分享失败";
      setShareError(message);
    } finally {
      setStoppingShare(false);
    }
  }, [persistedMindmapId, shareUrl]);

  const onDeleteMindmap = useCallback(async () => {
    if (!persistedMindmapId) return;
    const confirmed = await uiFeedback.confirm({
      title: "删除导图？",
      message: "确定删除该导图？此操作无法撤销。",
      confirmLabel: "删除",
      cancelLabel: "取消",
      tone: "danger",
    });
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
        throw new Error((json && "message" in json && json.message) || `删除失败（${res.status}）`);
      }

      router.push("/mindmaps");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      setDeleteMindmapError(message);
    } finally {
      setDeletingMindmap(false);
    }
  }, [persistedMindmapId, router]);

  const onPersistNodePosition = useCallback(
    async (args: { nodeId: string; x: number; y: number }) => {
      if (!persistedMindmapId) return;
      setPositionSaveError(null);
      try {
        const res = await fetch(`/api/mindmaps/${persistedMindmapId}/positions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ positions: [args] }),
        });
        const json = (await res.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; message?: string }
          | null;

        if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
          throw new Error(
            (json && "message" in json && json.message) || `位置保存失败（${res.status}）`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "位置保存失败";
        setPositionSaveError(message);
      }
    },
    [persistedMindmapId],
  );

  const onOpenTryDraftImport = useCallback(() => {
    setTryDraftImportError(null);
    setTryDraftImportDismissed(false);
    setTryDraftImportOpen(true);
  }, []);

  const stopTryDraftPersistenceAndClear = useCallback(() => {
    tryDraftPersistenceDisabledRef.current = true;
    pendingSaveRef.current = false;
    tryDraftJsonRef.current = null;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      localStorage.removeItem(TRY_DRAFT_STORAGE_KEY);
    } catch {}
  }, []);

  const onImportTryDraft = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return;

    setTryDraftImportAction("import");
    setTryDraftImportError(null);

    try {
      const uiPayload = {
        collapsedNodeIds: Array.from(collapsedNodeIds),
        selectedNodeId,
        viewport,
      };
      const res = await fetch("/api/mindmaps/import-try", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "try", draft: current, ui: uiPayload }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok: true; mindmapId: string }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
        throw new Error((json && "message" in json && json.message) || `导入失败（${res.status}）`);
      }

      stopTryDraftPersistenceAndClear();
      setTryDraftImportOpen(false);
      router.push(`/mindmaps/${json.mindmapId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "导入失败";
      setTryDraftImportError(message);
    } finally {
      setTryDraftImportAction(null);
    }
  }, [collapsedNodeIds, router, selectedNodeId, stopTryDraftPersistenceAndClear, viewport]);

  const onStartBlankMindmapFromTryDraft = useCallback(async () => {
    setTryDraftImportAction("blank");
    setTryDraftImportError(null);

    try {
      const res = await fetch("/api/mindmaps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; mindmapId: string }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
        throw new Error((json && "message" in json && json.message) || `创建失败（${res.status}）`);
      }

      stopTryDraftPersistenceAndClear();
      setTryDraftImportOpen(false);
      router.push(`/mindmaps/${json.mindmapId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      setTryDraftImportError(message);
    } finally {
      setTryDraftImportAction(null);
    }
  }, [router, stopTryDraftPersistenceAndClear]);

  const onDiscardTryDraft = useCallback(() => {
    setTryDraftImportAction("discard");
    setTryDraftImportError(null);
    stopTryDraftPersistenceAndClear();
    setTryDraftImportOpen(false);
    router.push("/mindmaps");
    router.refresh();
    setTryDraftImportAction(null);
  }, [router, stopTryDraftPersistenceAndClear]);

  const onExport = useCallback(
    async (format: "png" | "svg") => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setExportError("画布尚未就绪");
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
        const message = err instanceof Error ? err.message : "导出失败";
        setExportError(message);
      } finally {
        setExporting(null);
      }
    },
    [persistedMindmapId],
  );

  const dragHint = useMemo(() => {
    if (persistedMindmapId) return "F2 编辑 · Enter 子节点 · Tab 同级 · 拖拽移动（自动保存）";
    if (props.mode === "try") return "F2 编辑 · Enter 子节点 · Tab 同级 · 拖拽移动（本地保存）";
    return "F2 编辑 · Enter 子节点 · Tab 同级 · 拖拽移动（演示）";
  }, [persistedMindmapId, props.mode]);

  const statusLabel = useMemo(() => {
    if (props.mode === "demo") return "演示";
    if (props.mode === "try") {
      switch (saveStatus) {
        case "saving":
          return "保存中…";
        case "error":
          return "出错";
        case "saved":
        case "idle":
        default:
          return "本地";
      }
    }
    switch (saveStatus) {
      case "loading":
        return "加载中…";
      case "saving":
        return "保存中…";
      case "saved":
        return "已保存";
      case "error":
        return "出错";
      case "idle":
      default:
        return "就绪";
    }
  }, [props.mode, saveStatus]);

  const canUndo = history ? history.past.length > 0 : false;
  const canRedo = history ? history.future.length > 0 : false;

  return (
    <main className="flex min-h-screen flex-col">
      {props.mode === "try" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300">
          <div>
            {!authedUserId
              ? "你正在试玩本地草稿。登录后可使用 AI 与云端保存。"
              : initialTryDraft
                ? "检测到你的试玩草稿。导入到云端后可继续编辑并使用 AI。"
                : "你正在试玩。回到我的导图以开始云端编辑。"}
          </div>
          <div className="flex items-center gap-2">
            {!authedUserId ? (
              <>
                <Link
                  className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  href="/login?next=/try"
                >
                  登录
                </Link>
                <Link
                  className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                  href="/signup?next=/try"
                >
                  注册
                </Link>
              </>
            ) : initialTryDraft ? (
              <>
                <button
                  className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  onClick={onOpenTryDraftImport}
                  type="button"
                >
                  导入草稿
                </button>
                <Link
                  className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                  href="/mindmaps"
                >
                  回到我的导图
                </Link>
              </>
            ) : (
              <Link
                className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium hover:bg-white dark:border-zinc-800 dark:hover:bg-zinc-900"
                href="/mindmaps"
              >
                回到我的导图
              </Link>
            )}
          </div>
        </div>
      ) : null}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">MindMaps AI</div>
          <div className="text-xs text-zinc-500">
            <span aria-atomic="true" aria-live="polite" className="mr-2">
              {statusLabel}
            </span>
            选中：{selectedLabel}
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {persistedMindmapId ? (
            <button
              aria-controls="mindmap-ai-panel"
              aria-expanded={chatDrawerOpen}
              className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              onClick={() => setChatDrawerOpen((prev) => !prev)}
              type="button"
            >
              AI
            </button>
          ) : null}
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            <div className={TOOLBAR_GROUP_CLASS_NAME}>
              <span className={TOOLBAR_GROUP_LABEL_CLASS_NAME}>编辑</span>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canUndo}
                onClick={onUndo}
                title="撤销 (⌘Z / Ctrl+Z)"
                type="button"
              >
                撤销
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canRedo}
                onClick={onRedo}
                title="重做 (⌘⇧Z / Ctrl+Y)"
                type="button"
              >
                重做
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !selectedNodeId}
                onClick={onOpenInspector}
                title="详情"
                type="button"
              >
                详情
              </button>
            </div>

            <div className={TOOLBAR_GROUP_CLASS_NAME}>
              <span className={TOOLBAR_GROUP_LABEL_CLASS_NAME}>结构</span>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state}
                onClick={onAddChild}
                title="新增子节点 (Enter)"
                type="button"
              >
                新增子节点
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canAddSibling}
                onClick={onAddSibling}
                title="新增同级 (Tab)"
                type="button"
              >
                新增同级
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canIndent}
                onClick={onIndent}
                title="缩进"
                type="button"
              >
                缩进
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canOutdent}
                onClick={onOutdent}
                title="取消缩进"
                type="button"
              >
                取消缩进
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canMoveUp}
                onClick={() => onMoveSibling("up")}
                title="上移"
                type="button"
              >
                上移
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canMoveDown}
                onClick={() => onMoveSibling("down")}
                title="下移"
                type="button"
              >
                下移
              </button>
            </div>

            <div className={TOOLBAR_GROUP_CLASS_NAME}>
              <span className={TOOLBAR_GROUP_LABEL_CLASS_NAME}>视图</span>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || !canToggleCollapse}
                onClick={onToggleCollapse}
                title={selectedIsCollapsed ? "展开" : "折叠"}
                type="button"
              >
                {selectedIsCollapsed ? "展开" : "折叠"}
              </button>
            </div>

            <div className={TOOLBAR_GROUP_CLASS_NAME}>
              <span className={TOOLBAR_GROUP_LABEL_CLASS_NAME}>导出</span>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || exporting !== null}
                onClick={() => onExport("png")}
                title="导出 PNG"
                type="button"
              >
                {exporting === "png" ? "导出中…" : "导出 PNG"}
              </button>
              <button
                className={TOOLBAR_BUTTON_CLASS_NAME}
                disabled={!state || exporting !== null}
                onClick={() => onExport("svg")}
                title="导出 SVG"
                type="button"
              >
                {exporting === "svg" ? "导出中…" : "导出 SVG"}
              </button>
            </div>

            <details className="relative" ref={dangerMenuRef}>
              <summary
                aria-label="更多操作"
                className={TOOLBAR_MENU_SUMMARY_CLASS_NAME}
                title="更多"
              >
                ⋯
              </summary>
              <div className={TOOLBAR_MENU_PANEL_CLASS_NAME}>
                <button
                  className={TOOLBAR_MENU_ITEM_DANGER_CLASS_NAME}
                  disabled={!state || !selectedNodeId || selectedNodeId === state.rootNodeId}
                  onClick={() => {
                    if (dangerMenuRef.current) dangerMenuRef.current.open = false;
                    onDelete();
                  }}
                  title="删除 (Backspace / Delete)"
                  type="button"
                >
                  删除节点
                </button>
                {persistedMindmapId ? (
                  <button
                    className={TOOLBAR_MENU_ITEM_DANGER_CLASS_NAME}
                    disabled={!state || deletingMindmap}
                    onClick={() => {
                      if (dangerMenuRef.current) dangerMenuRef.current.open = false;
                      void onDeleteMindmap();
                    }}
                    title="删除导图"
                    type="button"
                  >
                    {deletingMindmap ? "删除导图中…" : "删除导图"}
                  </button>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </header>

      {loadError ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-10">
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-950/50 dark:bg-red-950/30 dark:text-red-200"
            role="alert"
          >
            加载失败：{loadError}
          </div>
          <Link className="text-sm underline" href="/mindmaps">
            回到我的导图
          </Link>
        </div>
      ) : !state ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-10">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">加载中…</div>
        </div>
      ) : (
        <div className="flex flex-1">
          <div className="flex min-h-0 flex-1 flex-col">
            {deleteMindmapError ? (
              <div
                className="border-b border-zinc-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-red-950/30 dark:text-red-200"
                role="alert"
              >
                删除失败：{deleteMindmapError}
              </div>
            ) : null}
            {shareError ? (
              <div
                className="border-b border-zinc-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-red-950/30 dark:text-red-200"
                role="alert"
              >
                分享失败：{shareError}
              </div>
            ) : null}
            {persistedMindmapId ? (
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-zinc-500">分享</div>
                    <div className="mt-0.5">
                      {shareUrl ? "公开（持链接可见，只读）" : "私有（仅我可见）"}
                    </div>
                    {shareUrl ? (
                      <a
                        className="mt-1 block break-all underline"
                        href={shareUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {shareUrl}
                      </a>
                    ) : (
                      <div className="mt-1 text-[11px] text-zinc-500">
                        生成链接后可分享只读页面。
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-zinc-500">
                      公开页不会展示聊天记录与 AI ops。
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      disabled={!state || sharing || stoppingShare || deletingMindmap}
                      onClick={onShare}
                      title={shareUrl ? "刷新链接" : "生成链接"}
                      type="button"
                    >
                      {sharing ? "处理中…" : shareUrl ? "刷新链接" : "生成链接"}
                    </button>
                    {shareUrl ? (
                      <>
                        <button
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                          disabled={sharing || stoppingShare}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(shareUrl);
                              setCopied(true);
                            } catch {
                              setCopied(false);
                            }
                          }}
                          title="复制链接"
                          type="button"
                        >
                          {copied ? "已复制" : "复制链接"}
                        </button>
                        <button
                          className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-950/50 dark:bg-zinc-950 dark:text-red-200 dark:hover:bg-red-950/30"
                          disabled={sharing || stoppingShare}
                          onClick={onStopSharing}
                          title="停止分享"
                          type="button"
                        >
                          {stoppingShare ? "停止中…" : "停止分享"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {saveError ? (
              <div
                className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-red-200"
                role="alert"
              >
                保存失败：{saveError}
              </div>
            ) : null}
            {uiSaveError ? (
              <div
                className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-red-200"
                role="alert"
              >
                视图状态保存失败：{uiSaveError}
              </div>
            ) : null}
            {positionSaveError ? (
              <div
                className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-red-200"
                role="alert"
              >
                位置保存失败：{positionSaveError}
              </div>
            ) : null}
            {exportError ? (
              <div
                className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-red-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-red-200"
                role="alert"
              >
                导出失败：{exportError}
              </div>
            ) : null}
            <div className="relative min-h-0 flex-1" ref={canvasHotkeysScopeRef}>
              <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-md border border-zinc-200 bg-white/90 px-2 py-1 text-[11px] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300">
                {dragHint}
              </div>
              <MindmapCanvas
                ref={canvasRef}
                collapsedNodeIds={collapsedNodeIds}
                editable
                editingNodeId={editingNodeId}
                highlightByNodeId={highlightByNodeId}
                onCancelEditNodeId={onCancelEditNodeId}
                onCommitNodeTitle={onCommitNodeTitle}
                onPersistNodePosition={onPersistNodePosition}
                onRequestEditNodeId={onRequestEditNodeId}
                onSelectNodeId={setSelectedNodeId}
                onViewportChangeEnd={setViewport}
                selectedNodeId={selectedNodeId}
                state={state}
                defaultViewport={viewport}
              />
            </div>
          </div>
          {persistedMindmapId ? (
            <MindmapChatSidebar
              mode="drawer"
              mindmapId={persistedMindmapId}
              onOpenChange={setChatDrawerOpen}
              onApplyOperations={applyAIOperations}
              onRollbackToPresentId={rollbackToPresentId}
              open={chatDrawerOpen}
              selectedNodeId={selectedNodeId}
              selectedNodeLabel={selectedLabel}
            />
          ) : props.mode === "try" ? (
            <aside className="hidden w-80 shrink-0 flex-col border-l border-zinc-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-950">
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="text-sm font-medium">提示词示例（登录后可用）</div>
                <div className="mt-1 text-xs text-zinc-500">
                  试玩用于体验编辑器手感；登录后可用 AI 一句话扩展结构。
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4 text-sm text-zinc-700 dark:text-zinc-200">
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  为“产品发布计划”生成导图骨架。
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  把“风险”节点展开 5 个分支，并补充应对措施。
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  重新组织结构：把“执行”拆成“准备/进行中/复盘”三个阶段。
                </div>
              </div>
              <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex gap-2">
                  {!authedUserId ? (
                    <>
                      <Link
                        className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        href="/login?next=/try"
                      >
                        登录
                      </Link>
                      <Link
                        className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        href="/signup?next=/try"
                      >
                        注册
                      </Link>
                    </>
                  ) : initialTryDraft ? (
                    <>
                      <button
                        className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        onClick={onOpenTryDraftImport}
                        type="button"
                      >
                        导入草稿
                      </button>
                      <Link
                        className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        href="/mindmaps"
                      >
                        回到列表
                      </Link>
                    </>
                  ) : (
                    <Link
                      className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      href="/mindmaps"
                    >
                      回到我的导图
                    </Link>
                  )}
                </div>
              </div>
            </aside>
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

      {props.mode === "try" && authedUserId && initialTryDraft && tryDraftImportOpen ? (
        <TryDraftImportModal
          action={tryDraftImportAction}
          error={tryDraftImportError}
          onClose={() => {
            setTryDraftImportOpen(false);
            setTryDraftImportDismissed(true);
          }}
          onDiscard={onDiscardTryDraft}
          onImport={() => void onImportTryDraft()}
          onStartBlank={() => void onStartBlankMindmapFromTryDraft()}
          updatedAt={initialTryDraft.updatedAt}
        />
      ) : null}
    </main>
  );
}
