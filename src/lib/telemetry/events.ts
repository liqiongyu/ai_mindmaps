export const TELEMETRY_EVENT_NAMES = [
  "landing_cta_click",
  "try_opened",
  "editor_opened",
  "node_added",
  "ai_request_sent",
  "ai_ops_applied",
  "mindmap_saved",
  "export_succeeded",
  "share_link_generated",
  "try_draft_detected_after_auth",
  "try_draft_imported",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];
