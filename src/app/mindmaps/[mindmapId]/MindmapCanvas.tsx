"use client";

import "@xyflow/react/dist/style.css";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import { useCallback, useMemo } from "react";

import type { MindmapState } from "@/lib/mindmap/ops";
import { mindmapStateToFlow } from "@/lib/mindmap/flow";

export function MindmapCanvas({
  state,
  selectedNodeId,
  onSelectNodeId,
}: {
  state: MindmapState;
  selectedNodeId: string | null;
  onSelectNodeId: (nodeId: string | null) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const graph = mindmapStateToFlow(state);
    const nextNodes = graph.nodes.map((node): Node => {
      return { ...node, selected: node.id === selectedNodeId };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [selectedNodeId, state]);

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
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <ReactFlow
        edges={edges}
        fitView
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
