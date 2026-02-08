import { describe, expect, test } from "vitest";

import { getSessionId } from "./client";

describe("getSessionId", () => {
  test("is stable within a process", () => {
    const id1 = getSessionId();
    const id2 = getSessionId();

    expect(id2).toBe(id1);
    expect(id1).toMatch(/^server_session_/);
  });
});
