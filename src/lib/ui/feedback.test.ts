import { beforeEach, describe, expect, test, vi } from "vitest";

import { uiFeedback } from "./feedback";

describe("uiFeedback", () => {
  beforeEach(() => {
    uiFeedback.clearAllForTest();
    vi.useRealTimers();
  });

  test("enqueue adds a toast and returns its id", () => {
    const id = uiFeedback.enqueue({ type: "info", message: "hello" });
    const snapshot = uiFeedback.getSnapshot();
    expect(snapshot.toasts).toHaveLength(1);
    expect(snapshot.toasts[0].id).toBe(id);
    expect(snapshot.toasts[0].message).toBe("hello");
  });

  test("dismiss removes a toast", () => {
    const id = uiFeedback.enqueue({ type: "success", message: "ok", autoDismissMs: null });
    expect(uiFeedback.getSnapshot().toasts).toHaveLength(1);
    uiFeedback.dismiss(id);
    expect(uiFeedback.getSnapshot().toasts).toHaveLength(0);
  });

  test("autoDismiss removes a toast after timeout", () => {
    vi.useFakeTimers();
    const id = uiFeedback.enqueue({ type: "success", message: "ok", autoDismissMs: 10 });
    expect(uiFeedback.getSnapshot().toasts.some((t) => t.id === id)).toBe(true);
    vi.advanceTimersByTime(10);
    expect(uiFeedback.getSnapshot().toasts.some((t) => t.id === id)).toBe(false);
  });

  test("confirm resolves and is queued", async () => {
    const p1 = uiFeedback.confirm({ title: "t1", message: "m1" });
    const p2 = uiFeedback.confirm({ title: "t2", message: "m2" });

    expect(uiFeedback.getSnapshot().activeConfirm?.title).toBe("t1");

    uiFeedback.respondToConfirm(true);
    await expect(p1).resolves.toBe(true);
    expect(uiFeedback.getSnapshot().activeConfirm?.title).toBe("t2");

    uiFeedback.respondToConfirm(false);
    await expect(p2).resolves.toBe(false);
    expect(uiFeedback.getSnapshot().activeConfirm).toBeNull();
  });

  test("getSnapshot is referentially stable without state changes", () => {
    const first = uiFeedback.getSnapshot();
    const second = uiFeedback.getSnapshot();
    expect(second).toBe(first);

    uiFeedback.enqueue({ type: "info", message: "hello" });
    const third = uiFeedback.getSnapshot();
    expect(third).not.toBe(second);
  });
});
