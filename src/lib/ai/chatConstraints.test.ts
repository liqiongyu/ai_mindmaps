import { describe, expect, test } from "vitest";

import {
  buildAiChatConstraintsInstructionBlock,
  DEFAULT_AI_CHAT_CONSTRAINTS,
  formatAiChatConstraintsSummary,
  normalizeAiChatConstraints,
  validateAiChatOperationsAgainstConstraints,
} from "./chatConstraints";

describe("ai/chatConstraints", () => {
  test("normalizeAiChatConstraints returns defaults", () => {
    expect(normalizeAiChatConstraints(undefined)).toEqual(DEFAULT_AI_CHAT_CONSTRAINTS);
    expect(normalizeAiChatConstraints(null)).toEqual(DEFAULT_AI_CHAT_CONSTRAINTS);
  });

  test("formatAiChatConstraintsSummary returns zh label", () => {
    expect(
      formatAiChatConstraintsSummary({
        outputLanguage: "zh",
        branchCount: 4,
        depth: 2,
        allowMove: true,
        allowDelete: false,
      }),
    ).toBe("约束：中文 · 分支数 4 · 深度 2 · 允许移动 · 禁止删除");
  });

  test("buildAiChatConstraintsInstructionBlock includes fields", () => {
    const block = buildAiChatConstraintsInstructionBlock({
      outputLanguage: "en",
      branchCount: 8,
      depth: 3,
      allowMove: false,
      allowDelete: true,
    });

    expect(block).toContain("Constraints:");
    expect(block).toContain("Output language: English");
    expect(block).toContain("Branch count (target): 8");
    expect(block).toContain("Depth (target): 3");
    expect(block).toContain("Allow moving/reordering nodes: no");
    expect(block).toContain("Allow deleting nodes: yes");
  });

  test("validateAiChatOperationsAgainstConstraints blocks delete operations", () => {
    const res = validateAiChatOperationsAgainstConstraints({
      constraints: { ...DEFAULT_AI_CHAT_CONSTRAINTS, allowDelete: false },
      operations: [{ type: "delete_node", nodeId: "n1" }],
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toContain("默认不会删除节点");
    }
  });

  test("validateAiChatOperationsAgainstConstraints blocks move operations", () => {
    const res = validateAiChatOperationsAgainstConstraints({
      constraints: { ...DEFAULT_AI_CHAT_CONSTRAINTS, allowMove: false },
      operations: [{ type: "move_node", nodeId: "n1", newParentId: "p1" }],
    });

    expect(res.ok).toBe(false);
  });

  test("validateAiChatOperationsAgainstConstraints passes when allowed", () => {
    const res = validateAiChatOperationsAgainstConstraints({
      constraints: { ...DEFAULT_AI_CHAT_CONSTRAINTS, allowDelete: true, allowMove: true },
      operations: [
        { type: "delete_node", nodeId: "n1" },
        { type: "move_node", nodeId: "n2", newParentId: "p1" },
      ],
    });

    expect(res.ok).toBe(true);
  });
});
