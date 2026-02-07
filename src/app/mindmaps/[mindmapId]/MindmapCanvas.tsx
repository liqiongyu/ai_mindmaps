"use client";

import "@xyflow/react/dist/style.css";

import type { Node, ReactFlowInstance } from "@xyflow/react";
import {
  Background,
  Controls,
  ReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import {
  forwardRef,
  useCallback,
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
  }: {
    state: MindmapState;
    selectedNodeId: string | null;
    onSelectNodeId: (nodeId: string | null) => void;
  },
  ref: ForwardedRef<MindmapCanvasHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const { nodes, edges } = useMemo(() => {
    const graph = mindmapStateToFlow(state);
    const nextNodes = graph.nodes.map((node): Node => {
      return { ...node, selected: node.id === selectedNodeId };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [selectedNodeId, state]);

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
        nodesDraggable={false}
        nodesFocusable
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
