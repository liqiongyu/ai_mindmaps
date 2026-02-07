import type { MindmapState } from "../mindmap/ops";

type OutlineOptions = {
  maxDepth: number;
  maxLines: number;
  maxTitleChars: number;
};

const DEFAULT_OUTLINE_OPTIONS: OutlineOptions = {
  maxDepth: 6,
  maxLines: 800,
  maxTitleChars: 80,
};

function truncateTitle(title: string, maxChars: number): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}

function buildOrderedChildrenByParent(state: MindmapState): Map<string, string[]> {
  const children = new Map<string, Array<{ id: string; orderIndex: number }>>();

  for (const node of Object.values(state.nodesById)) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId) ?? [];
    list.push({ id: node.id, orderIndex: node.orderIndex });
    children.set(node.parentId, list);
  }

  const result = new Map<string, string[]>();
  for (const [parentId, list] of children.entries()) {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    result.set(
      parentId,
      list.map((item) => item.id),
    );
  }

  return result;
}

function buildOutlineLines(
  state: MindmapState,
  rootId: string,
  { maxDepth, maxLines, maxTitleChars }: OutlineOptions,
): { lines: string[]; truncated: boolean } {
  const root = state.nodesById[rootId];
  if (!root) {
    throw new Error(`Node not found: ${rootId}`);
  }

  const childrenByParent = buildOrderedChildrenByParent(state);
  const lines: string[] = [];
  let truncated = false;

  const stack: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;

    if (lines.length >= maxLines) {
      truncated = true;
      break;
    }

    const node = state.nodesById[current.id];
    if (!node) continue;

    const indent = "  ".repeat(current.depth);
    lines.push(`${indent}- (${node.id}) ${truncateTitle(node.text, maxTitleChars)}`);

    const childIds = childrenByParent.get(node.id) ?? [];
    if (childIds.length === 0) continue;

    if (current.depth >= maxDepth) {
      if (lines.length < maxLines) {
        lines.push(`${indent}  - …`);
      } else {
        truncated = true;
      }
      continue;
    }

    for (let i = childIds.length - 1; i >= 0; i -= 1) {
      stack.push({ id: childIds[i], depth: current.depth + 1 });
    }
  }

  if (truncated) {
    lines.push("- … (truncated)");
  }

  return { lines, truncated };
}

function buildPathIds(state: MindmapState, nodeId: string): string[] {
  const seen = new Set<string>();
  const path: string[] = [];

  let current: string | null = nodeId;
  while (current) {
    if (seen.has(current)) break;
    seen.add(current);
    path.push(current);
    current = state.nodesById[current]?.parentId ?? null;
  }

  return path.reverse();
}

export function buildGlobalMindmapContext(
  state: MindmapState,
  options?: Partial<OutlineOptions>,
): string {
  const merged: OutlineOptions = { ...DEFAULT_OUTLINE_OPTIONS, ...options };
  const nodeCount = Object.keys(state.nodesById).length;
  const { lines } = buildOutlineLines(state, state.rootNodeId, merged);

  return [`Mindmap outline (id + title). Total nodes: ${nodeCount}.`, ...lines].join("\n");
}

export function buildNodeMindmapContext(
  state: MindmapState,
  selectedNodeId: string,
  options?: Partial<OutlineOptions> & { maxNotesChars?: number },
): string {
  const merged: OutlineOptions = { ...DEFAULT_OUTLINE_OPTIONS, ...options };
  const node = state.nodesById[selectedNodeId];
  if (!node) {
    throw new Error(`Node not found: ${selectedNodeId}`);
  }

  const pathIds = buildPathIds(state, selectedNodeId);
  const childrenByParent = buildOrderedChildrenByParent(state);

  const parentId = node.parentId;
  const siblingIds = parentId ? (childrenByParent.get(parentId) ?? []) : [selectedNodeId];

  const { lines: subtreeLines } = buildOutlineLines(state, selectedNodeId, merged);

  const maxNotesChars = options?.maxNotesChars ?? 500;
  const notes = node.notes?.trim() ? node.notes.trim() : "";
  const truncatedNotes =
    notes.length > maxNotesChars ? `${notes.slice(0, Math.max(0, maxNotesChars - 1))}…` : notes;

  return [
    `Selected node: (${node.id}) ${truncateTitle(node.text, merged.maxTitleChars)}`,
    "",
    "Path (root -> selected):",
    ...pathIds.map((id) => {
      const item = state.nodesById[id];
      const title = item ? truncateTitle(item.text, merged.maxTitleChars) : id;
      return `- (${id}) ${title}`;
    }),
    "",
    "Siblings (same parent):",
    ...siblingIds.map((id) => {
      const item = state.nodesById[id];
      const title = item ? truncateTitle(item.text, merged.maxTitleChars) : id;
      return `- (${id}) ${title}`;
    }),
    "",
    `Selected subtree outline (maxDepth=${merged.maxDepth}):`,
    ...subtreeLines,
    notes
      ? ["", `Selected node notes (truncated to ${maxNotesChars} chars):`, truncatedNotes].join(
          "\n",
        )
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAiChatMindmapContext({
  state,
  scope,
  selectedNodeId,
  largeMindmapThreshold = 300,
}: {
  state: MindmapState;
  scope: "global" | "node";
  selectedNodeId?: string | null;
  largeMindmapThreshold?: number;
}): string {
  const nodeCount = Object.keys(state.nodesById).length;
  const isLarge = nodeCount >= largeMindmapThreshold;

  if (scope === "node") {
    if (!selectedNodeId) {
      throw new Error("selectedNodeId is required for node scope context");
    }
    return buildNodeMindmapContext(state, selectedNodeId, {
      maxDepth: isLarge ? 4 : 6,
      maxLines: isLarge ? 400 : 800,
      maxTitleChars: 80,
      maxNotesChars: isLarge ? 300 : 500,
    });
  }

  return buildGlobalMindmapContext(state, {
    maxDepth: isLarge ? 5 : 8,
    maxLines: isLarge ? 600 : 1200,
    maxTitleChars: 80,
  });
}
