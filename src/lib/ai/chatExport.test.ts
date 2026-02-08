import { describe, expect, test } from "vitest";

import { buildAiChatAuditExportFilename } from "./chatExport";

describe("ai/chatExport", () => {
  test("builds a deterministic filename for global scope", () => {
    const filename = buildAiChatAuditExportFilename({
      mindmapId: "m1",
      scope: "global",
      exportedAt: new Date(Date.UTC(2026, 1, 8, 12, 34, 56)),
    });

    expect(filename).toBe("mma-chat-audit-m1-global-20260208-123456Z.json");
  });

  test("includes node id for node scope", () => {
    const filename = buildAiChatAuditExportFilename({
      mindmapId: "m1",
      scope: "node",
      selectedNodeId: "n1",
      exportedAt: new Date(Date.UTC(2026, 1, 8, 12, 34, 56)),
    });

    expect(filename).toBe("mma-chat-audit-m1-node-n1-20260208-123456Z.json");
  });

  test("handles invalid exportedAt strings", () => {
    const filename = buildAiChatAuditExportFilename({
      mindmapId: "m1",
      scope: "global",
      exportedAt: "not-a-date",
    });

    expect(filename).toMatch(/^mma-chat-audit-m1-global-\d{8}-\d{6}Z\.json$/);
  });
});
