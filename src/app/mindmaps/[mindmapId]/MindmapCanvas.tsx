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
import { mindmapStateToFlow } from "@/lib/mindmap/flow";

type ExportResult = { ok: true } | { ok: false; message: string };

export type MindmapCanvasHandle = {
  exportPng: (fileName: string) => Promise<ExportResult>;
  exportSvg: (fileName: string) => Promise<ExportResult>;
};

type MindmapCanvasNodeData = {
  label: string;
  isEditing: boolean;
  onRequestEditNodeId?: (nodeId: string) => void;
  onCommitNodeTitle?: (args: { nodeId: string; title: string }) => { ok: true } | { ok: false };
  onCancelEditNodeId?: (nodeId: string) => void;
  onAddChildForNode?: (nodeId: string) => void;
  onAddSiblingForNode?: (nodeId: string) => void;
};

type MindmapCanvasNode = Node<MindmapCanvasNodeData, "mindmapNode">;

const MindmapNode = memo(function MindmapNode({
  id,
  data,
  selected,
}: NodeProps<MindmapCanvasNode>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipNextBlurRef = useRef(false);

  useEffect(() => {
    if (!data.isEditing) return;
    const handle = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(handle);
  }, [data.isEditing]);

  const commit = useCallback(
    (action?: "add_child" | "add_sibling") => {
      const title = (inputRef.current?.value ?? data.label).trim();
      if (!title) {
        data.onCancelEditNodeId?.(id);
        return;
      }

      data.onCommitNodeTitle?.({ nodeId: id, title });
      if (action === "add_child") {
        data.onAddChildForNode?.(id);
      }
      if (action === "add_sibling") {
        data.onAddSiblingForNode?.(id);
      }
    },
    [data, id],
  );

  if (data.isEditing) {
    return (
      <div
        className={`rounded-md border bg-white px-3 py-2 shadow-sm dark:bg-zinc-950 ${
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
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              data.onCancelEditNodeId?.(id);
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              skipNextBlurRef.current = true;
              commit("add_child");
              return;
            }

            if (event.key === "Tab") {
              event.preventDefault();
              event.stopPropagation();
              skipNextBlurRef.current = true;
              commit("add_sibling");
            }
          }}
          ref={inputRef}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border bg-white px-3 py-2 text-sm shadow-sm dark:bg-zinc-950 ${
        selected ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800"
      }`}
      onDoubleClick={(event) => {
        event.stopPropagation();
        data.onRequestEditNodeId?.(id);
      }}
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
    editable = false,
    onPersistNodePosition,
    editingNodeId,
    onRequestEditNodeId,
    onCommitNodeTitle,
    onCancelEditNodeId,
    onAddChildForNode,
    onAddSiblingForNode,
  }: {
    state: MindmapState;
    selectedNodeId: string | null;
    onSelectNodeId: (nodeId: string | null) => void;
    collapsedNodeIds?: ReadonlySet<string>;
    editable?: boolean;
    onPersistNodePosition?: (args: { nodeId: string; x: number; y: number }) => void;
    editingNodeId?: string | null;
    onRequestEditNodeId?: (nodeId: string) => void;
    onCommitNodeTitle?: (args: { nodeId: string; title: string }) => { ok: true } | { ok: false };
    onCancelEditNodeId?: (nodeId: string) => void;
    onAddChildForNode?: (nodeId: string) => void;
    onAddSiblingForNode?: (nodeId: string) => void;
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
          onRequestEditNodeId,
          onCommitNodeTitle,
          onCancelEditNodeId,
          onAddChildForNode,
          onAddSiblingForNode,
        },
        selected: node.id === selectedNodeId,
      };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [
    collapsedNodeIds,
    editable,
    editingNodeId,
    onAddChildForNode,
    onAddSiblingForNode,
    onCancelEditNodeId,
    onCommitNodeTitle,
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
        return { ok: false, message: "Canvas not ready yet" };
      }

      const viewportEl = wrapper.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!viewportEl) {
        return { ok: false, message: "Canvas viewport not found" };
      }

      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (!width || !height) {
        return { ok: false, message: "Canvas has zero size" };
      }

      const nodeList = instance.getNodes();
      if (nodeList.length === 0) {
        return { ok: false, message: "No nodes to export" };
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
        const message = err instanceof Error ? err.message : "Export failed";
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
        fitView
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={editable}
        nodesFocusable
        nodeTypes={{ mindmapNode: MindmapNode }}
        onNodeDragStart={editable ? onNodeDragStart : undefined}
        onNodeDragStop={editable ? onNodeDragStop : undefined}
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
