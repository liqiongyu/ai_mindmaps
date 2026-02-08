function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatTimestampForFilename(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = pad2(date.getUTCMonth() + 1);
  const dd = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());
  const mi = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}Z`;
}

export function buildAiChatAuditExportFilename(args: {
  mindmapId: string;
  scope: "global" | "node";
  selectedNodeId?: string | null;
  exportedAt?: string | Date;
}): string {
  const exportedAt =
    typeof args.exportedAt === "string"
      ? new Date(args.exportedAt)
      : args.exportedAt instanceof Date
        ? args.exportedAt
        : new Date();

  const ts = Number.isNaN(exportedAt.getTime())
    ? formatTimestampForFilename(new Date())
    : formatTimestampForFilename(exportedAt);
  const nodeSuffix = args.scope === "node" && args.selectedNodeId ? `-${args.selectedNodeId}` : "";
  return `mma-chat-audit-${args.mindmapId}-${args.scope}${nodeSuffix}-${ts}.json`;
}
