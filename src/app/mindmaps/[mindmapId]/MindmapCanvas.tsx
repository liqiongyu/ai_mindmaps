"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  ReactFlow,
  getNodesBounds,
  getViewportForBounds,
  useNodesState,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ForwardedRef,
} from "react";

import type { MindmapState } from "@/lib/mindmap/ops";
import type { OperationHighlightKind } from "@/lib/mindmap/operationSummary";
import { mindmapStateToFlow } from "@/lib/mindmap/flow";
import type { MindmapViewport } from "@/lib/mindmap/uiState";

type ExportResult = { ok: true } | { ok: false; message: string };

export type MindmapCanvasHandle = {
  exportPng: (fileName: string) => Promise<ExportResult>;
  exportSvg: (fileName: string) => Promise<ExportResult>;
};

type MindmapCanvasNodeData = {
  label: string;
  isEditing: boolean;
  highlight?: OperationHighlightKind | null;
  onSelectNodeId?: (nodeId: string) => void;
  onRequestEditNodeId?: (nodeId: string) => void;
  onCommitNodeTitle?: (args: { nodeId: string; title: string }) => { ok: true } | { ok: false };
  onCancelEditNodeId?: (nodeId: string) => void;
};

type MindmapCanvasNode = Node<MindmapCanvasNodeData, "mindmapNode">;

const MindmapNode = memo(function MindmapNode({
  id,
  data,
  selected,
}: NodeProps<MindmapCanvasNode>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipNextBlurRef = useRef(false);

  const highlightClass = useMemo(() => {
    switch (data.highlight) {
      case "add":
        return "ring-2 ring-emerald-500/70 dark:ring-emerald-400/70 !bg-emerald-50 dark:!bg-emerald-950/30";
      case "rename":
        return "ring-2 ring-blue-500/70 dark:ring-blue-400/70 !bg-blue-50 dark:!bg-blue-950/30";
      case "move":
        return "ring-2 ring-purple-500/70 dark:ring-purple-400/70 !bg-purple-50 dark:!bg-purple-950/30";
      default:
        return "";
    }
  }, [data.highlight]);

  useEffect(() => {
    if (!data.isEditing) return;
    const handle = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(handle);
  }, [data.isEditing]);

  const commit = useCallback((): { ok: true } | { ok: false; reason: "empty" | "rejected" } => {
    const title = (inputRef.current?.value ?? data.label).trim();
    if (!title) return { ok: false, reason: "empty" };

    const result = data.onCommitNodeTitle?.({ nodeId: id, title });
    if (result && !result.ok) return { ok: false, reason: "rejected" };
    return { ok: true };
  }, [data, id]);

  if (data.isEditing) {
    return (
      <div
        className={`rounded-md border bg-white px-3 py-2 shadow-sm transition-all duration-300 dark:bg-zinc-950 ${highlightClass} ${
          selected ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <input
          className="w-full bg-transparent text-sm outline-none"
          defaultValue={data.label}
          onBlur={() => {
            if (skipNextBlurRef.current) {
              skipNextBlurRef.current = false;
              return;
            }
            const result = commit();
            if (!result.ok) {
              if (result.reason === "empty") {
                globalThis.alert("标题不能为空");
              }
              data.onCancelEditNodeId?.(id);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              skipNextBlurRef.current = true;
              data.onCancelEditNodeId?.(id);
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              skipNextBlurRef.current = true;
              const result = commit();
              if (!result.ok && result.reason === "empty") {
                globalThis.alert("标题不能为空");
              }
              return;
            }

            if (event.key === "Tab") {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
          }}
          ref={inputRef}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-all duration-300 dark:bg-zinc-950 ${highlightClass} ${
        selected ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800"
      }`}
      onDoubleClick={(event) => {
        event.stopPropagation();
        data.onRequestEditNodeId?.(id);
      }}
      onFocus={() => data.onSelectNodeId?.(id)}
      role="button"
      tabIndex={0}
    >
      {data.label}
    </div>
  );
});

MindmapNode.displayName = "MindmapNode";

export const MindmapCanvas = forwardRef(function MindmapCanvas(
  {
    state,
    selectedNodeId,
    onSelectNodeId,
    collapsedNodeIds,
    defaultViewport,
    onViewportChangeEnd,
    highlightByNodeId,
    editable = false,
    onPersistNodePosition,
    editingNodeId,
    onRequestEditNodeId,
    onCommitNodeTitle,
    onCancelEditNodeId,
  }: {
    state: MindmapState;
    selectedNodeId: string | null;
    onSelectNodeId: (nodeId: string | null) => void;
    collapsedNodeIds?: ReadonlySet<string>;
    defaultViewport?: MindmapViewport | null;
    onViewportChangeEnd?: (viewport: MindmapViewport) => void;
    highlightByNodeId?: Readonly<Record<string, OperationHighlightKind>>;
    editable?: boolean;
    onPersistNodePosition?: (args: { nodeId: string; x: number; y: number }) => void;
    editingNodeId?: string | null;
    onRequestEditNodeId?: (nodeId: string) => void;
    onCommitNodeTitle?: (args: { nodeId: string; title: string }) => { ok: true } | { ok: false };
    onCancelEditNodeId?: (nodeId: string) => void;
  },
  ref: ForwardedRef<MindmapCanvasHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<MindmapCanvasNode> | null>(null);
  const draggingRef = useRef(false);

  const { nodes: layoutNodes, edges } = useMemo(() => {
    const graph = mindmapStateToFlow(state, { collapsedNodeIds });
    const nextNodes = graph.nodes.map((node): MindmapCanvasNode => {
      return {
        ...node,
        type: "mindmapNode",
        draggable: editable && node.id !== state.rootNodeId,
        data: {
          label: node.data.label,
          isEditing: node.id === editingNodeId,
          highlight: highlightByNodeId?.[node.id] ?? null,
          onSelectNodeId,
          onRequestEditNodeId,
          onCommitNodeTitle,
          onCancelEditNodeId,
        },
        selected: node.id === selectedNodeId,
      };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [
    collapsedNodeIds,
    editable,
    editingNodeId,
    highlightByNodeId,
    onCancelEditNodeId,
    onCommitNodeTitle,
    onSelectNodeId,
    onRequestEditNodeId,
    selectedNodeId,
    state,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

  useEffect(() => {
    if (draggingRef.current) return;
    setNodes((current) => {
      const currentById = new Map(current.map((node) => [node.id, node]));
      return layoutNodes.map((layoutNode) => {
        const existing = currentById.get(layoutNode.id);
        if (!existing) return layoutNode;
        return { ...layoutNode, position: existing.position };
      });
    });
  }, [layoutNodes, setNodes]);

  const exportWith = useCallback(
    async (format: "png" | "svg", fileName: string): Promise<ExportResult> => {
      const wrapper = wrapperRef.current;
      const instance = reactFlowInstanceRef.current;
      if (!wrapper || !instance || !instance.viewportInitialized) {
        return { ok: false, message: "画布尚未就绪" };
      }

      const viewportEl = wrapper.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!viewportEl) {
        return { ok: false, message: "未找到画布视口" };
      }

      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (!width || !height) {
        return { ok: false, message: "画布尺寸为 0" };
      }

      const nodeList = instance.getNodes();
      if (nodeList.length === 0) {
        return { ok: false, message: "没有可导出的节点" };
      }

      const bounds = getNodesBounds(nodeList);
      const viewport = getViewportForBounds(bounds, width, height, 0.1, 2, 0.1);
      const style = {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      };

      let dataUrl: string;
      try {
        if (format === "png") {
          dataUrl = await toPng(viewportEl, {
            backgroundColor: "#ffffff",
            height,
            pixelRatio: 2,
            style,
            width,
          });
        } else {
          dataUrl = await toSvg(viewportEl, {
            backgroundColor: "#ffffff",
            height,
            style,
            width,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "导出失败";
        return { ok: false, message };
      }

      const link = document.createElement("a");
      link.setAttribute("download", fileName);
      link.setAttribute("href", dataUrl);
      link.click();
      return { ok: true };
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      exportPng: (fileName) => exportWith("png", fileName),
      exportSvg: (fileName) => exportWith("svg", fileName),
    }),
    [exportWith],
  );

  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      onSelectNodeId(node.id);
    },
    [onSelectNodeId],
  );

  const onNodeDragStart = useCallback(
    (_event: unknown, node: Node) => {
      draggingRef.current = true;
      onSelectNodeId(node.id);
      setNodes((current) =>
        current.map((n) =>
          n.id === node.id ? { ...n, selected: true } : { ...n, selected: false },
        ),
      );
    },
    [onSelectNodeId, setNodes],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      draggingRef.current = false;
      if (!editable) return;
      if (node.id === state.rootNodeId) return;
      onPersistNodePosition?.({ nodeId: node.id, x: node.position.x, y: node.position.y });
    },
    [editable, onPersistNodePosition, state.rootNodeId],
  );

  const onPaneClick = useCallback(() => {
    onSelectNodeId(null);
  }, [onSelectNodeId]);

  return (
    <div className="h-full w-full" ref={wrapperRef}>
      <ReactFlow
        edges={edges}
        defaultViewport={defaultViewport ?? undefined}
        fitView={!defaultViewport}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={editable}
        nodesFocusable
        nodeTypes={{ mindmapNode: MindmapNode }}
        onNodeDragStart={editable ? onNodeDragStart : undefined}
        onNodeDragStop={editable ? onNodeDragStop : undefined}
        onMoveEnd={(event, viewport) => {
          if (!event) return;
          onViewportChangeEnd?.({
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          });
        }}
        onNodesChange={editable ? onNodesChange : undefined}
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
});

MindmapCanvas.displayName = "MindmapCanvas";
