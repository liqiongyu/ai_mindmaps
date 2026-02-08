import { describe, expect, test } from "vitest";

import { TelemetryIngestRequestSchema } from "./schemas";

describe("TelemetryIngestRequestSchema", () => {
  test("accepts a valid payload", () => {
    const result = TelemetryIngestRequestSchema.safeParse({
      sessionId: "session_12345678",
      path: "/try",
      events: [
        {
          name: "try_opened",
          createdAt: "2026-02-08T00:00:00.000Z",
          properties: { source: "landing" },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("rejects unknown events", () => {
    const result = TelemetryIngestRequestSchema.safeParse({
      sessionId: "session_12345678",
      events: [{ name: "unknown_event" }],
    });

    expect(result.success).toBe(false);
  });

  test("rejects too many events", () => {
    const result = TelemetryIngestRequestSchema.safeParse({
      sessionId: "session_12345678",
      events: Array.from({ length: 21 }, () => ({ name: "try_opened" })),
    });

    expect(result.success).toBe(false);
  });
});
