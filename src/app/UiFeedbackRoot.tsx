"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useSyncExternalStore } from "react";

import {
  uiFeedback,
  type UiFeedbackAction,
  type UiFeedbackConfirmTone,
  type UiFeedbackSnapshot,
  type UiFeedbackToast,
} from "@/lib/ui/feedback";

function useUiFeedbackSnapshot(): UiFeedbackSnapshot {
  return useSyncExternalStore(uiFeedback.subscribe, uiFeedback.getSnapshot, uiFeedback.getSnapshot);
}

function getToastRole(type: UiFeedbackToast["type"]): "status" | "alert" {
  return type === "error" ? "alert" : "status";
}

function getToastAccent(type: UiFeedbackToast["type"]): string {
  switch (type) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-950/40 dark:bg-emerald-950/30 dark:text-emerald-100";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-950/40 dark:bg-amber-950/30 dark:text-amber-100";
    case "error":
      return "border-red-200 bg-red-50 text-red-900 dark:border-red-950/40 dark:bg-red-950/30 dark:text-red-100";
    case "info":
    default:
      return "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";
  }
}

function ActionButton({ action, onDone }: { action: UiFeedbackAction; onDone: () => void }) {
  return (
    <button
      className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
      onClick={async () => {
        try {
          await action.onClick?.();
        } finally {
          const dismiss = action.dismissOnClick ?? true;
          if (dismiss) onDone();
        }
      }}
      type="button"
    >
      {action.label}
    </button>
  );
}

function ToastCard({ toast }: { toast: UiFeedbackToast }) {
  const role = getToastRole(toast.type);
  const accent = getToastAccent(toast.type);

  const title = toast.title?.trim();
  const message = toast.message.trim();

  const actions = useMemo(() => toast.actions ?? [], [toast.actions]);

  return (
    <div
      aria-atomic="true"
      className={`pointer-events-auto rounded-md border px-3 py-2 shadow-sm ${accent}`}
      role={role}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? <div className="text-sm font-medium">{title}</div> : null}
          <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-200">{message}</div>
        </div>
        {toast.dismissible ? (
          <button
            aria-label="关闭提示"
            className="shrink-0 rounded-md border border-transparent px-2 py-1 text-xs text-zinc-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
            onClick={() => uiFeedback.dismiss(toast.id)}
            type="button"
          >
            关闭
          </button>
        ) : null}
      </div>

      {actions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <ActionButton
              action={action}
              key={`${toast.id}_${index}`}
              onDone={() => uiFeedback.dismiss(toast.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toneToConfirmButtonClass(tone: UiFeedbackConfirmTone): string {
  if (tone === "danger") {
    return "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600";
  }
  return "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: UiFeedbackConfirmTone;
}) {
  const titleId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const restorePreviousFocus = useCallback(() => {
    const previous = previousFocusRef.current;
    if (!previous) return;
    try {
      previous.focus();
    } catch {
      // ignore
    }
  }, []);

  const resolveAndRestoreFocus = useCallback(
    (value: boolean) => {
      uiFeedback.respondToConfirm(value);
      restorePreviousFocus();
    },
    [restorePreviousFocus],
  );

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handle = requestAnimationFrame(() => confirmButtonRef.current?.focus());
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      resolveAndRestoreFocus(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolveAndRestoreFocus]);

  return (
    <div
      aria-hidden="false"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={() => resolveAndRestoreFocus(false)}
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="text-base font-medium text-zinc-900 dark:text-zinc-100" id={titleId}>
          {title}
        </div>
        <div className="mt-2 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
          {message}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            onClick={() => resolveAndRestoreFocus(false)}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-md px-3 py-2 text-sm font-medium ${toneToConfirmButtonClass(tone)}`}
            onClick={() => resolveAndRestoreFocus(true)}
            ref={confirmButtonRef}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UiFeedbackRoot() {
  const snapshot = useUiFeedbackSnapshot();

  return (
    <>
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {snapshot.toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>

      {snapshot.activeConfirm ? (
        <ConfirmModal
          cancelLabel={snapshot.activeConfirm.cancelLabel}
          confirmLabel={snapshot.activeConfirm.confirmLabel}
          message={snapshot.activeConfirm.message}
          title={snapshot.activeConfirm.title}
          tone={snapshot.activeConfirm.tone}
        />
      ) : null}
    </>
  );
}
