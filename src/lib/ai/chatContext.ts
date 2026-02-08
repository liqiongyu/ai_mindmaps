import type { MindmapState } from "../mindmap/ops";

type OutlineOptions = {
  maxDepth: number;
  maxLines: number;
  maxTitleChars: number;
};

export type AiChatMindmapContextMeta = {
  chars: number;
  lines: number;
  truncated: boolean;
  budget: {
    maxChars: number;
    maxLines: number;
    maxDepth: number;
    maxTitleChars: number;
    maxSiblingLines?: number;
    maxNotesChars?: number;
  };
};

export type AiChatMindmapContextResult =
  | { ok: true; context: string; meta: AiChatMindmapContextMeta }
  | {
      ok: false;
      code: "context_too_large";
      message: string;
      hints: string[];
      meta: AiChatMindmapContextMeta;
    };

type ContextBudget = {
  maxChars: number;
  minLines: number;
};

type NodeContextOptions = OutlineOptions & {
  maxNotesChars: number;
  maxSiblingLines: number;
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

function buildGlobalMindmapContextResult(
  state: MindmapState,
  options: OutlineOptions,
): { context: string; meta: Pick<AiChatMindmapContextMeta, "chars" | "lines" | "truncated"> } {
  const nodeCount = Object.keys(state.nodesById).length;
  const { lines, truncated } = buildOutlineLines(state, state.rootNodeId, options);

  const allLines = [`Mindmap outline (id + title). Total nodes: ${nodeCount}.`, ...lines];
  const context = allLines.join("\n");

  return {
    context,
    meta: {
      chars: context.length,
      lines: allLines.length,
      truncated,
    },
  };
}

export function buildGlobalMindmapContext(
  state: MindmapState,
  options?: Partial<OutlineOptions>,
): string {
  const merged: OutlineOptions = { ...DEFAULT_OUTLINE_OPTIONS, ...options };
  return buildGlobalMindmapContextResult(state, merged).context;
}

function buildNodeMindmapContextResult(
  state: MindmapState,
  selectedNodeId: string,
  options: NodeContextOptions,
): { context: string; meta: Pick<AiChatMindmapContextMeta, "chars" | "lines" | "truncated"> } {
  const node = state.nodesById[selectedNodeId];
  if (!node) {
    throw new Error(`Node not found: ${selectedNodeId}`);
  }

  const pathIds = buildPathIds(state, selectedNodeId);
  const childrenByParent = buildOrderedChildrenByParent(state);

  const parentId = node.parentId;
  const siblingIds = parentId ? (childrenByParent.get(parentId) ?? []) : [selectedNodeId];
  const visibleSiblingIds = siblingIds.slice(0, options.maxSiblingLines);
  const hiddenSiblingCount = Math.max(0, siblingIds.length - visibleSiblingIds.length);

  const { lines: subtreeLines, truncated } = buildOutlineLines(state, selectedNodeId, options);

  const notes = node.notes?.trim() ? node.notes.trim() : "";
  const truncatedNotes =
    notes.length > options.maxNotesChars
      ? `${notes.slice(0, Math.max(0, options.maxNotesChars - 1))}…`
      : notes;

  const allLines: string[] = [];
  allLines.push(`Selected node: (${node.id}) ${truncateTitle(node.text, options.maxTitleChars)}`);

  allLines.push("");
  allLines.push("Path (root -> selected):");
  for (const id of pathIds) {
    const item = state.nodesById[id];
    const title = item ? truncateTitle(item.text, options.maxTitleChars) : id;
    allLines.push(`- (${id}) ${title}`);
  }

  allLines.push("");
  allLines.push("Siblings (same parent):");
  for (const id of visibleSiblingIds) {
    const item = state.nodesById[id];
    const title = item ? truncateTitle(item.text, options.maxTitleChars) : id;
    allLines.push(`- (${id}) ${title}`);
  }
  if (hiddenSiblingCount > 0) {
    allLines.push(`- … (and ${hiddenSiblingCount} more siblings)`);
  }

  allLines.push("");
  allLines.push(`Selected subtree outline (maxDepth=${options.maxDepth}):`);
  allLines.push(...subtreeLines);

  if (notes) {
    allLines.push("");
    allLines.push(`Selected node notes (truncated to ${options.maxNotesChars} chars):`);
    allLines.push(truncatedNotes);
  }

  const context = allLines.join("\n");

  return {
    context,
    meta: {
      chars: context.length,
      lines: allLines.length,
      truncated,
    },
  };
}

export function buildNodeMindmapContext(
  state: MindmapState,
  selectedNodeId: string,
  options?: Partial<OutlineOptions> & { maxNotesChars?: number; maxSiblingLines?: number },
): string {
  const mergedOutline: OutlineOptions = { ...DEFAULT_OUTLINE_OPTIONS, ...options };
  const nodeOptions: NodeContextOptions = {
    ...mergedOutline,
    maxNotesChars: options?.maxNotesChars ?? 500,
    maxSiblingLines: options?.maxSiblingLines ?? 80,
  };
  return buildNodeMindmapContextResult(state, selectedNodeId, nodeOptions).context;
}

function shrinkBudget(value: number, min: number): number {
  if (value <= min) return min;
  return Math.max(min, Math.floor(value * 0.7));
}

export function buildAiChatMindmapContext({
  state,
  scope,
  selectedNodeId,
  largeMindmapThreshold = 300,
  budget,
}: {
  state: MindmapState;
  scope: "global" | "node";
  selectedNodeId?: string | null;
  largeMindmapThreshold?: number;
  budget?: Partial<ContextBudget>;
}): AiChatMindmapContextResult {
  const nodeCount = Object.keys(state.nodesById).length;
  const isLarge = nodeCount >= largeMindmapThreshold;

  const defaultBudget: ContextBudget =
    scope === "node"
      ? { maxChars: isLarge ? 32000 : 42000, minLines: 120 }
      : { maxChars: isLarge ? 42000 : 52000, minLines: 200 };
  const mergedBudget: ContextBudget = { ...defaultBudget, ...budget };

  const buildOk = (
    context: string,
    meta: AiChatMindmapContextMeta,
  ): AiChatMindmapContextResult => ({
    ok: true,
    context,
    meta,
  });

  const buildTooLarge = (
    meta: AiChatMindmapContextMeta,
    hints: string[],
  ): AiChatMindmapContextResult => ({
    ok: false,
    code: "context_too_large",
    message: "Mindmap context too large",
    hints,
    meta,
  });

  const maxAttempts = 5;

  if (scope === "node") {
    if (!selectedNodeId) {
      throw new Error("selectedNodeId is required for node scope context");
    }
    let options: NodeContextOptions = {
      maxDepth: isLarge ? 4 : 6,
      maxLines: isLarge ? 400 : 800,
      maxTitleChars: 80,
      maxNotesChars: isLarge ? 300 : 500,
      maxSiblingLines: isLarge ? 40 : 80,
    };

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const { context, meta } = buildNodeMindmapContextResult(state, selectedNodeId, options);
      const fullMeta: AiChatMindmapContextMeta = {
        ...meta,
        budget: {
          maxChars: mergedBudget.maxChars,
          maxLines: options.maxLines,
          maxDepth: options.maxDepth,
          maxTitleChars: options.maxTitleChars,
          maxNotesChars: options.maxNotesChars,
          maxSiblingLines: options.maxSiblingLines,
        },
      };

      if (context.length <= mergedBudget.maxChars) return buildOk(context, fullMeta);

      const nextMaxLines = shrinkBudget(options.maxLines, mergedBudget.minLines);
      const nextSiblingLines = shrinkBudget(options.maxSiblingLines, 10);
      const nextNotesChars = shrinkBudget(options.maxNotesChars, 120);
      const nextTitleChars = shrinkBudget(options.maxTitleChars, 50);
      const nextDepth = attempt % 2 === 1 ? Math.max(2, options.maxDepth - 1) : options.maxDepth;

      const noFurtherShrink =
        nextMaxLines === options.maxLines &&
        nextSiblingLines === options.maxSiblingLines &&
        nextNotesChars === options.maxNotesChars &&
        nextTitleChars === options.maxTitleChars &&
        nextDepth === options.maxDepth;

      options = {
        ...options,
        maxLines: nextMaxLines,
        maxSiblingLines: nextSiblingLines,
        maxNotesChars: nextNotesChars,
        maxTitleChars: nextTitleChars,
        maxDepth: nextDepth,
      };

      if (noFurtherShrink) {
        return buildTooLarge(fullMeta, [
          "Switch to node scope and focus on a smaller subtree.",
          "Reduce depth/branching constraints and retry.",
          "Ask the AI to only work on the current branch.",
        ]);
      }
    }

    const { meta } = buildNodeMindmapContextResult(state, selectedNodeId, options);
    return buildTooLarge(
      {
        ...meta,
        budget: {
          maxChars: mergedBudget.maxChars,
          maxLines: options.maxLines,
          maxDepth: options.maxDepth,
          maxTitleChars: options.maxTitleChars,
          maxNotesChars: options.maxNotesChars,
          maxSiblingLines: options.maxSiblingLines,
        },
      },
      [
        "Switch to node scope and focus on a smaller subtree.",
        "Reduce depth/branching constraints and retry.",
        "Ask the AI to only work on the current branch.",
      ],
    );
  }

  let options: OutlineOptions = {
    maxDepth: isLarge ? 5 : 8,
    maxLines: isLarge ? 600 : 1200,
    maxTitleChars: 80,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { context, meta } = buildGlobalMindmapContextResult(state, options);
    const fullMeta: AiChatMindmapContextMeta = {
      ...meta,
      budget: {
        maxChars: mergedBudget.maxChars,
        maxLines: options.maxLines,
        maxDepth: options.maxDepth,
        maxTitleChars: options.maxTitleChars,
      },
    };

    if (context.length <= mergedBudget.maxChars) return buildOk(context, fullMeta);

    const nextMaxLines = shrinkBudget(options.maxLines, mergedBudget.minLines);
    const nextTitleChars = shrinkBudget(options.maxTitleChars, 50);
    const nextDepth = attempt % 2 === 1 ? Math.max(3, options.maxDepth - 1) : options.maxDepth;

    const noFurtherShrink =
      nextMaxLines === options.maxLines &&
      nextTitleChars === options.maxTitleChars &&
      nextDepth === options.maxDepth;

    options = {
      ...options,
      maxLines: nextMaxLines,
      maxTitleChars: nextTitleChars,
      maxDepth: nextDepth,
    };

    if (noFurtherShrink) {
      return buildTooLarge(fullMeta, [
        "Switch to node scope and focus on a smaller subtree.",
        "Reduce depth/branching constraints and retry.",
        "Ask the AI to only work on the current branch.",
      ]);
    }
  }

  const { meta } = buildGlobalMindmapContextResult(state, options);
  return buildTooLarge(
    {
      ...meta,
      budget: {
        maxChars: mergedBudget.maxChars,
        maxLines: options.maxLines,
        maxDepth: options.maxDepth,
        maxTitleChars: options.maxTitleChars,
      },
    },
    [
      "Switch to node scope and focus on a smaller subtree.",
      "Reduce depth/branching constraints and retry.",
      "Ask the AI to only work on the current branch.",
    ],
  );
}
