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

type MoveNodeArgs = { nodeId: string; newParentId: string };

export const MindmapCanvas = forwardRef(function MindmapCanvas(
  {
    state,
    selectedNodeId,
    onSelectNodeId,
    collapsedNodeIds,
    onMoveNode,
  }: {
    state: MindmapState;
    selectedNodeId: string | null;
    onSelectNodeId: (nodeId: string | null) => void;
    collapsedNodeIds?: ReadonlySet<string>;
    onMoveNode?: (args: MoveNodeArgs) => boolean;
  },
  ref: ForwardedRef<MindmapCanvasHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const draggingRef = useRef(false);

  const enableDragToMove = Boolean(onMoveNode);

  const { nodes: layoutNodes, edges } = useMemo(() => {
    const graph = mindmapStateToFlow(state, { collapsedNodeIds });
    const nextNodes = graph.nodes.map((node): Node => {
      return {
        ...node,
        draggable: enableDragToMove && node.id !== state.rootNodeId,
        selected: node.id === selectedNodeId,
      };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [collapsedNodeIds, enableDragToMove, selectedNodeId, state]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);

  useEffect(() => {
    if (draggingRef.current) return;
    setNodes(layoutNodes);
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

      const instance = reactFlowInstanceRef.current;
      if (!enableDragToMove || !onMoveNode || !instance) {
        setNodes(layoutNodes);
        return;
      }

      const source = state.nodesById[node.id];
      if (!source || source.id === state.rootNodeId) {
        setNodes(layoutNodes);
        return;
      }

      const intersections = instance
        .getIntersectingNodes(node, true)
        .filter((candidate) => candidate.id !== node.id);

      if (intersections.length === 0) {
        setNodes(layoutNodes);
        return;
      }

      const movedRect = nodeToRect(node);
      const pickTarget = () => {
        if (movedRect.width <= 0 || movedRect.height <= 0) {
          return intersections.length === 1 ? intersections[0] : null;
        }

        let best: Node | null = null;
        let bestArea = 0;
        for (const candidate of intersections) {
          const area = intersectionArea(movedRect, nodeToRect(candidate));
          if (area > bestArea) {
            bestArea = area;
            best = candidate;
          }
        }

        const threshold = movedRect.width * movedRect.height * 0.15;
        return best && bestArea >= threshold ? best : null;
      };

      const target = pickTarget();
      if (!target) {
        setNodes(layoutNodes);
        return;
      }

      if (target.id === source.parentId) {
        setNodes(layoutNodes);
        return;
      }

      const moved = onMoveNode({ nodeId: source.id, newParentId: target.id });
      if (!moved) {
        setNodes(layoutNodes);
      }
    },
    [enableDragToMove, layoutNodes, onMoveNode, setNodes, state],
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
        nodesDraggable={enableDragToMove}
        nodesFocusable
        onNodeDragStart={enableDragToMove ? onNodeDragStart : undefined}
        onNodeDragStop={enableDragToMove ? onNodeDragStop : undefined}
        onNodesChange={enableDragToMove ? onNodesChange : undefined}
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

function nodeToRect(node: Node): { x: number; y: number; width: number; height: number } {
  const width = node.width ?? node.measured?.width ?? node.initialWidth ?? 0;
  const height = node.height ?? node.measured?.height ?? node.initialHeight ?? 0;
  return { x: node.position.x, y: node.position.y, width, height };
}

function intersectionArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  if (!a.width || !a.height || !b.width || !b.height) return 0;
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}
