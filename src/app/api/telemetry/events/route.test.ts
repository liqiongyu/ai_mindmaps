import { beforeEach, describe, expect, test, vi } from "vitest";

import { createSupabaseMock, type SupabaseMock } from "@/testUtils/supabaseMock";

const mocks = vi.hoisted(() => {
  const state = { supabase: null as unknown as SupabaseMock };
  return {
    state,
    createSupabaseServerClient: vi.fn(async () => state.supabase),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

describe("/api/telemetry/events route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("returns 400 on invalid body", async () => {
    mocks.state.supabase = createSupabaseMock();
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/telemetry/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, message: "Invalid request body" });
  });

  test("returns 500 when RPC fails", async () => {
    const supabase = createSupabaseMock();
    supabase.__setRpcHandler("mma_log_events", async () => ({
      data: null,
      error: { message: "rpc failed" },
    }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/telemetry/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: "session_1234",
          events: [{ name: "try_opened", createdAt: new Date().toISOString() }],
        }),
      }),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({
      ok: false,
      message: "Failed to ingest telemetry events",
    });
  });

  test("returns ok:true when ingested", async () => {
    const supabase = createSupabaseMock();
    supabase.__setRpcHandler("mma_log_events", async () => ({ data: null, error: null }));
    mocks.state.supabase = supabase;

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/telemetry/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: "session_1234",
          events: [{ name: "try_opened", createdAt: new Date().toISOString() }],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
