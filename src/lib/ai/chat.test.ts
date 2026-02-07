import { describe, expect, test } from "vitest";

import { AiChatHistoryRequestSchema, AiChatPersistedMessageSchema } from "./chat";

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
