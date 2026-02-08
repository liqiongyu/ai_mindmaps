"use client";

import type { TelemetryEventName } from "./events";

type PendingEvent = {
  name: TelemetryEventName;
  createdAt: string;
  properties?: Record<string, unknown>;
};

const SESSION_STORAGE_KEY = "mma:session_id:v1";
const MAX_QUEUE_SIZE = 200;
const MAX_FLUSH_BATCH = 20;

let cachedSessionId: string | null = null;
let queue: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random
    ? `${prefix}_${random}`
    : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") {
    cachedSessionId = createId("server_session");
    return cachedSessionId;
  }

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.trim().length >= 8) {
      cachedSessionId = existing;
      return existing;
    }
  } catch {
    // Ignore storage errors and fallback to in-memory session.
  }

  const id = createId("session");
  cachedSessionId = id;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // Ignore storage errors.
  }
  return id;
}

async function flush() {
  if (flushing) return;
  if (queue.length === 0) return;
  flushing = true;

  const batch = queue.splice(0, MAX_FLUSH_BATCH);
  const payload = {
    sessionId: getSessionId(),
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    events: batch,
  };
  const body = JSON.stringify(payload);

  try {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/telemetry/events", blob)) {
        return;
      }
    } catch {
      // Ignore and fallback to fetch.
    }

    await fetch("/api/telemetry/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort; drop on failure for now to keep client lightweight.
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush();
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 400);
}

export function track(name: TelemetryEventName, properties?: Record<string, unknown>) {
  queue.push({
    name,
    createdAt: new Date().toISOString(),
    properties: properties && Object.keys(properties).length > 0 ? properties : undefined,
  });

  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
  }

  scheduleFlush();
}
