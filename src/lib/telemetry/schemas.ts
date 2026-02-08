import { z } from "zod";

import { TELEMETRY_EVENT_NAMES } from "./events";

export const TelemetryEventSchema = z
  .object({
    name: z.enum(TELEMETRY_EVENT_NAMES),
    createdAt: z.string().datetime().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const TelemetryIngestRequestSchema = z
  .object({
    sessionId: z.string().trim().min(8).max(128),
    path: z.string().trim().min(1).max(512).optional(),
    events: z.array(TelemetryEventSchema).min(1).max(20),
  })
  .strict();

export type TelemetryIngestRequest = z.infer<typeof TelemetryIngestRequestSchema>;
