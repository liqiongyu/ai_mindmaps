import type { Edge, Node } from "@xyflow/react";
import { hierarchy, tree } from "d3-hierarchy";

import type { MindmapNode, MindmapState } from "./ops";

type TreeNode = {
  id: string;
  children?: TreeNode[];
};

export type MindmapFlowNodeData = {
  label: string;
};

export type MindmapFlowGraph = {
  nodes: Node<MindmapFlowNodeData>[];
  edges: Edge[];
};

export function mindmapStateToFlow(
  state: MindmapState,
  options?: { collapsedNodeIds?: ReadonlySet<string> },
): MindmapFlowGraph {
  const childrenByParentId = indexChildren(state.nodesById);
  const root = hierarchy<TreeNode>(
    buildTree(state.rootNodeId, childrenByParentId, options?.collapsedNodeIds),
  );

  const layout = tree<TreeNode>().nodeSize([100, 260]);
  const laidOut = layout(root);

  const descendants = laidOut.descendants();
  const minX = Math.min(...descendants.map((d) => d.y));
  const minY = Math.min(...descendants.map((d) => d.x));

  const nodes: Node<MindmapFlowNodeData>[] = descendants.map((d) => {
    const node = state.nodesById[d.data.id];
    if (!node) throw new Error(`Node not found: ${d.data.id}`);

    return {
      id: d.data.id,
      type: "default",
      data: { label: node.text },
      position: { x: d.y - minX, y: d.x - minY },
    };
  });

  const edges: Edge[] = descendants.flatMap((d) => {
    if (!d.parent) return [];
    return [
      {
        id: `e-${d.parent.data.id}-${d.data.id}`,
        source: d.parent.data.id,
        target: d.data.id,
        type: "smoothstep",
      },
    ];
  });

  return { nodes, edges };
}

function indexChildren(nodesById: Record<string, MindmapNode>): Record<string, MindmapNode[]> {
  const childrenByParentId: Record<string, MindmapNode[]> = {};
  for (const node of Object.values(nodesById)) {
    if (!node.parentId) continue;
    (childrenByParentId[node.parentId] ||= []).push(node);
  }

  for (const children of Object.values(childrenByParentId)) {
    children.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  return childrenByParentId;
}

function buildTree(
  nodeId: string,
  childrenByParentId: Record<string, MindmapNode[]>,
  collapsedNodeIds?: ReadonlySet<string>,
): TreeNode {
  if (collapsedNodeIds?.has(nodeId)) return { id: nodeId };
  const children = childrenByParentId[nodeId];
  if (!children?.length) return { id: nodeId };
  return {
    id: nodeId,
    children: children.map((child) => buildTree(child.id, childrenByParentId, collapsedNodeIds)),
  };
}
