export type AiChatErrorInfo = {
  code: string | null;
  serverMessage: string | null;
  hints: string[];
  contextChars: number | null;
  budgetMaxChars: number | null;
};

export function parseAiChatErrorInfo(payload: unknown): AiChatErrorInfo {
  if (!payload || typeof payload !== "object") {
    return {
      code: null,
      serverMessage: null,
      hints: [],
      contextChars: null,
      budgetMaxChars: null,
    };
  }

  const record = payload as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : null;
  const serverMessage = typeof record.message === "string" ? record.message : null;
  const hints = Array.isArray(record.hints)
    ? record.hints.filter((h): h is string => typeof h === "string")
    : [];

  let contextChars: number | null = null;
  let budgetMaxChars: number | null = null;
  const context = record.context;
  if (context && typeof context === "object") {
    const ctx = context as Record<string, unknown>;
    contextChars = typeof ctx.chars === "number" ? ctx.chars : null;
    const budget = ctx.budget;
    if (budget && typeof budget === "object") {
      const b = budget as Record<string, unknown>;
      budgetMaxChars = typeof b.maxChars === "number" ? b.maxChars : null;
    }
  }

  return { code, serverMessage, hints, contextChars, budgetMaxChars };
}

export function formatAiChatActionableErrorMessage(args: {
  status: number;
  code: string | null;
  serverMessage: string | null;
  contextChars: number | null;
  budgetMaxChars: number | null;
}): string {
  const { status, code, serverMessage, contextChars, budgetMaxChars } = args;

  const sizeHint =
    contextChars !== null && budgetMaxChars !== null
      ? `\n\n上下文超出上限（当前 ${contextChars} 字符，建议 <= ${budgetMaxChars} 字符）。`
      : "";

  switch (code) {
    case "context_too_large":
      return `导图过大，建议切换到节点模式以提高成功率。${sizeHint}\n\n建议：\n1) 切换节点模式\n2) 降低深度到 1-2\n3) 仅处理当前分支`;
    case "model_output_truncated":
      return `AI 输出被截断，本次未应用改动：请缩小范围后重试。\n\n建议：\n1) 切换节点模式\n2) 降低深度到 1-2\n3) 仅处理当前分支`;
    case "model_output_empty":
      return `AI 未返回有效结果，本次未应用改动：请缩小范围后重试。\n\n建议：\n1) 切换节点模式\n2) 降低深度到 1-2\n3) 仅处理当前分支`;
    default:
      return serverMessage ?? `AI 请求失败（${status}）`;
  }
}
