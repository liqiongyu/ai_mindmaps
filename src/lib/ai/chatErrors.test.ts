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

  test("parses quota fields from error payload", () => {
    const info = parseAiChatErrorInfo({
      ok: false,
      code: "quota_exceeded",
      message: "今日 AI 调用已达上限，明日重置或升级套餐。",
      metric: "ai_chat",
      used: 100,
      limit: 100,
      resetAt: "2026-02-09T00:00:00.000Z",
      upgradeUrl: "/pricing",
    });

    expect(info.code).toBe("quota_exceeded");
    expect(info.metric).toBe("ai_chat");
    expect(info.used).toBe(100);
    expect(info.limit).toBe(100);
    expect(info.resetAt).toBe("2026-02-09T00:00:00.000Z");
    expect(info.upgradeUrl).toBe("/pricing");
  });

  test("formats actionable copy for quota_exceeded without server message", () => {
    const message = formatAiChatActionableErrorMessage({
      status: 429,
      code: "quota_exceeded",
      serverMessage: null,
      contextChars: null,
      budgetMaxChars: null,
    });

    expect(message).toContain("用量已达上限");
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
