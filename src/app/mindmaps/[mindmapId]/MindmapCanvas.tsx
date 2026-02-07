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
  type ReactFlowInstance,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import {
  forwardRef,
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

export const MindmapCanvas = forwardRef(function MindmapCanvas(
  {
    state,
    selectedNodeId,
    onSelectNodeId,
    collapsedNodeIds,
    editable = false,
  }: {
    state: MindmapState;
    selectedNodeId: string | null;
    onSelectNodeId: (nodeId: string | null) => void;
    collapsedNodeIds?: ReadonlySet<string>;
    editable?: boolean;
  },
  ref: ForwardedRef<MindmapCanvasHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const draggingRef = useRef(false);

  const { nodes: layoutNodes, edges } = useMemo(() => {
    const graph = mindmapStateToFlow(state, { collapsedNodeIds });
    const nextNodes = graph.nodes.map((node): Node => {
      return {
        ...node,
        draggable: editable && node.id !== state.rootNodeId,
        selected: node.id === selectedNodeId,
      };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [collapsedNodeIds, editable, selectedNodeId, state]);

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

  const onNodeDragStop = useCallback(() => {
    draggingRef.current = false;
  }, []);

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
