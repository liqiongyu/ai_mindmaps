"use client";

import "@xyflow/react/dist/style.css";

import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

import type { MindmapState } from "@/lib/mindmap/ops";
import { mindmapStateToFlow } from "@/lib/mindmap/flow";

export function MindmapCanvas({ state }: { state: MindmapState }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const graph = mindmapStateToFlow(state);
    const nextNodes = graph.nodes.map((node): Node => {
      return { ...node, selected: node.id === selectedNodeId };
    });
    return { nodes: nextNodes, edges: graph.edges };
  }, [selectedNodeId, state]);

  const onNodeClick = useCallback((_event: unknown, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

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
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
