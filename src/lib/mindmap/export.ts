export type MindmapExportFormat = "png" | "svg";

export function makeMindmapExportFilename(params: {
  format: MindmapExportFormat;
  mindmapId: string | null;
}): string {
  const id = params.mindmapId ?? "demo";
  return `mindmap-${id}.${params.format}`;
}
