import { describe, expect, test } from "vitest";

import { formatAiChatActionableErrorMessage, parseAiChatErrorInfo } from "./chatErrors";

describe("ai/chatErrors", () => {
  test("parses code + context budget info from error payload", () => {
    const info = parseAiChatErrorInfo({
      ok: false,
      code: "context_too_large",
      message: "Context too large",
      context: { chars: 1234, budget: { maxChars: 500 } },
    });

    expect(info.code).toBe("context_too_large");
    expect(info.serverMessage).toBe("Context too large");
    expect(info.contextChars).toBe(1234);
    expect(info.budgetMaxChars).toBe(500);
    expect(info.upgradeUrl).toBe(null);
  });

  test("formats actionable copy for standardized codes", () => {
    const message = formatAiChatActionableErrorMessage({
      status: 413,
      code: "context_too_large",
      serverMessage: null,
      contextChars: 1234,
      budgetMaxChars: 500,
    });

    expect(message).toContain("导图过大");
    expect(message).toContain("当前 1234 字符");
    expect(message).toContain("建议 <= 500 字符");
  });

  test("falls back to server message for unknown codes", () => {
    const message = formatAiChatActionableErrorMessage({
      status: 500,
      code: "some_unknown_code",
      serverMessage: "Something failed",
      contextChars: null,
      budgetMaxChars: null,
    });

    expect(message).toBe("Something failed");
  });
});
