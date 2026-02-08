import { describe, expect, test } from "vitest";

import {
  AiChatHistoryRequestSchema,
  AiChatPersistedMessageSchema,
  AiChatRequestSchema,
} from "./chat";

describe("ai/chat schemas", () => {
  test("AiChatHistoryRequestSchema requires selectedNodeId for node scope", () => {
    expect(AiChatHistoryRequestSchema.safeParse({ mindmapId: "m1", scope: "node" }).success).toBe(
      false,
    );

    expect(
      AiChatHistoryRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "node",
        selectedNodeId: "n1",
      }).success,
    ).toBe(true);
  });

  test("AiChatRequestSchema accepts constraints", () => {
    expect(
      AiChatRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "global",
        userMessage: "Hello",
        constraints: {
          outputLanguage: "zh",
          branchCount: 4,
          depth: 2,
          allowMove: true,
          allowDelete: false,
        },
      }).success,
    ).toBe(true);

    expect(
      AiChatRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "node",
        selectedNodeId: "n1",
        userMessage: "Expand",
        constraints: {
          outputLanguage: "en",
          branchCount: 8,
          depth: 3,
          allowMove: false,
          allowDelete: true,
        },
      }).success,
    ).toBe(true);

    expect(
      AiChatRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "global",
        userMessage: "Hello",
        constraints: {
          outputLanguage: "zh",
          branchCount: 3,
          depth: 2,
          allowMove: true,
          allowDelete: false,
        },
      }).success,
    ).toBe(false);
  });

  test("AiChatRequestSchema accepts dryRun and providedOutput", () => {
    expect(
      AiChatRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "global",
        userMessage: "Hello",
        dryRun: true,
      }).success,
    ).toBe(true);

    expect(
      AiChatRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "global",
        userMessage: "Hello",
        providedOutput: {
          assistant_message: "OK",
          operations: [{ type: "rename_node", nodeId: "n1", text: "Renamed" }],
          provider: "azure-openai",
          model: "gpt-5-mini",
        },
      }).success,
    ).toBe(true);

    expect(
      AiChatRequestSchema.safeParse({
        mindmapId: "m1",
        scope: "global",
        userMessage: "Hello",
        providedOutput: {
          assistant_message: "OK",
          operations: Array.from({ length: 201 }, (_, i) => ({
            type: "rename_node",
            nodeId: `n${i}`,
            text: "Renamed",
          })),
        },
      }).success,
    ).toBe(false);
  });

  test("AiChatPersistedMessageSchema enforces operations presence by role", () => {
    const op = { type: "rename_node", nodeId: "n1", text: "Renamed" } as const;

    expect(
      AiChatPersistedMessageSchema.safeParse({
        id: "msg1",
        role: "user",
        content: "Hello",
        operations: null,
        provider: null,
        model: null,
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);

    expect(
      AiChatPersistedMessageSchema.safeParse({
        id: "msg2",
        role: "assistant",
        content: "Sure",
        operations: [op],
        provider: "azure-openai",
        model: "gpt-5-mini",
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);

    expect(
      AiChatPersistedMessageSchema.safeParse({
        id: "msg3",
        role: "assistant",
        content: "Missing ops",
        operations: null,
        provider: "azure-openai",
        model: "gpt-5-mini",
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});
