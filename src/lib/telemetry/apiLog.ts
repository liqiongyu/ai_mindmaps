export type ApiLogLevel = "info" | "warn" | "error";

export type ApiLogEntry = {
  type: "api";
  route: string;
  method: string;
  status: number;
  ok: boolean;
  code?: string;
  duration_ms: number;
  user_id?: string | null;
  detail?: string;
};

export function logApi(entry: ApiLogEntry, level: ApiLogLevel = "info") {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  });

  switch (level) {
    case "error":
      console.error(line);
      return;
    case "warn":
      console.warn(line);
      return;
    case "info":
    default:
      console.info(line);
  }
}
