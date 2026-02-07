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
  const rootTree = buildTree(state.rootNodeId, childrenByParentId, options?.collapsedNodeIds);
  const rootChildren = rootTree.children ?? [];

  const leftChildren: TreeNode[] = [];
  const rightChildren: TreeNode[] = [];
  rootChildren.forEach((child, index) => {
    if (index % 2 === 0) {
      rightChildren.push(child);
      return;
    }
    leftChildren.push(child);
  });

  const layout = tree<TreeNode>().nodeSize([100, 260]);
  const leftLaidOut = layout(hierarchy<TreeNode>({ id: state.rootNodeId, children: leftChildren }));
  const rightLaidOut = layout(
    hierarchy<TreeNode>({ id: state.rootNodeId, children: rightChildren }),
  );

  const positionsById = new Map<string, { x: number; y: number }>();
  const edgesById = new Map<string, Edge>();

  const addSide = (args: { side: "left" | "right"; root: ReturnType<typeof layout> }) => {
    const { side, root } = args;
    const xMultiplier = side === "left" ? -1 : 1;
    const yOffset = -root.x;

    for (const d of root.descendants()) {
      const node = state.nodesById[d.data.id];
      if (!node) throw new Error(`Node not found: ${d.data.id}`);

      positionsById.set(d.data.id, { x: xMultiplier * d.y, y: d.x + yOffset });

      if (!d.parent) continue;
      const edge: Edge = {
        id: `e-${d.parent.data.id}-${d.data.id}`,
        source: d.parent.data.id,
        target: d.data.id,
        type: "smoothstep",
        style: { stroke: "#64748b", strokeWidth: 2 },
      };
      edgesById.set(edge.id, edge);
    }
  };

  addSide({ side: "left", root: leftLaidOut });
  addSide({ side: "right", root: rightLaidOut });

  const positions = [...positionsById.values()];
  const minX = Math.min(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));

  const nodes: Node<MindmapFlowNodeData>[] = [...positionsById.entries()].map(([id, pos]) => {
    const node = state.nodesById[id];
    if (!node) throw new Error(`Node not found: ${id}`);

    return {
      id,
      type: "default",
      data: { label: node.text },
      position: { x: pos.x - minX, y: pos.y - minY },
    };
  });

  return { nodes, edges: [...edgesById.values()] };
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
