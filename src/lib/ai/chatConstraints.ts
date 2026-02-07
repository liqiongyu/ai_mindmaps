import type { Operation } from "../mindmap/ops";

import type { AiChatConstraints } from "./chat";

export const DEFAULT_AI_CHAT_CONSTRAINTS: AiChatConstraints = {
  outputLanguage: "zh",
  branchCount: 4,
  depth: 2,
  allowMove: true,
  allowDelete: false,
};

export function normalizeAiChatConstraints(
  constraints: AiChatConstraints | null | undefined,
): AiChatConstraints {
  return constraints ?? DEFAULT_AI_CHAT_CONSTRAINTS;
}

export function formatAiChatConstraintsSummary(constraints: AiChatConstraints): string {
  const language = constraints.outputLanguage === "zh" ? "中文" : "英文";
  const move = constraints.allowMove ? "允许移动" : "禁止移动";
  const del = constraints.allowDelete ? "允许删除" : "禁止删除";
  return `约束：${language} · 分支数 ${constraints.branchCount} · 深度 ${constraints.depth} · ${move} · ${del}`;
}

export function buildAiChatConstraintsInstructionBlock(constraints: AiChatConstraints): string {
  const language = constraints.outputLanguage === "zh" ? "Chinese" : "English";
  const allowMove = constraints.allowMove ? "yes" : "no";
  const allowDelete = constraints.allowDelete ? "yes" : "no";

  return [
    "Constraints:",
    `- Output language: ${language}`,
    `- Branch count (target): ${constraints.branchCount}`,
    `- Depth (target): ${constraints.depth}`,
    `- Allow moving/reordering nodes: ${allowMove}`,
    `- Allow deleting nodes: ${allowDelete}`,
  ].join("\n");
}

export function validateAiChatOperationsAgainstConstraints({
  constraints,
  operations,
}: {
  constraints: AiChatConstraints;
  operations: Operation[];
}): { ok: true } | { ok: false; message: string } {
  if (!constraints.allowDelete && operations.some((op) => op.type === "delete_node")) {
    return {
      ok: false,
      message: "为安全起见，AI 默认不会删除节点。可在「高级设置」中允许删除。",
    };
  }

  if (
    !constraints.allowMove &&
    operations.some((op) => op.type === "move_node" || op.type === "reorder_children")
  ) {
    return {
      ok: false,
      message: "当前约束不允许移动节点。可在「高级设置」中允许移动。",
    };
  }

  return { ok: true };
}
