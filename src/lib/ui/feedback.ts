export type UiFeedbackType = "success" | "info" | "warning" | "error";

export type UiFeedbackAction = {
  label: string;
  onClick?: () => void | Promise<void>;
  dismissOnClick?: boolean;
};

export type UiFeedbackToast = {
  id: string;
  type: UiFeedbackType;
  title?: string;
  message: string;
  actions: UiFeedbackAction[];
  dismissible: boolean;
  autoDismissMs: number | null;
  createdAt: number;
};

export type UiFeedbackConfirmTone = "default" | "danger";

export type UiFeedbackConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: UiFeedbackConfirmTone;
};

type UiFeedbackConfirmRequest = {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: UiFeedbackConfirmTone;
  createdAt: number;
  resolve: (value: boolean) => void;
};

export type UiFeedbackSnapshot = {
  toasts: UiFeedbackToast[];
  activeConfirm: Omit<UiFeedbackConfirmRequest, "resolve"> | null;
};

type InternalState = {
  toasts: UiFeedbackToast[];
  activeConfirm: UiFeedbackConfirmRequest | null;
  confirmQueue: UiFeedbackConfirmRequest[];
};

type Listener = () => void;

function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random
    ? `${prefix}_${random}`
    : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getDefaultAutoDismissMs(type: UiFeedbackType): number | null {
  switch (type) {
    case "success":
      return 4000;
    case "info":
      return 4500;
    case "warning":
      return 6000;
    case "error":
      return null;
  }
}

function normalizeToast(input: {
  id?: string;
  type: UiFeedbackType;
  title?: string;
  message: string;
  actions?: UiFeedbackAction[];
  dismissible?: boolean;
  autoDismissMs?: number | null;
}): UiFeedbackToast {
  return {
    id: input.id ?? createId("toast"),
    type: input.type,
    title: input.title,
    message: input.message,
    actions: input.actions ?? [],
    dismissible: input.dismissible ?? true,
    autoDismissMs: input.autoDismissMs ?? getDefaultAutoDismissMs(input.type),
    createdAt: Date.now(),
  };
}

const listeners = new Set<Listener>();
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

let state: InternalState = {
  toasts: [],
  activeConfirm: null,
  confirmQueue: [],
};

let cachedSnapshotState: InternalState | null = null;
let cachedSnapshot: UiFeedbackSnapshot | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: InternalState) {
  state = next;
  emit();
}

function clearToastTimer(id: string) {
  const handle = toastTimers.get(id);
  if (handle) {
    clearTimeout(handle);
    toastTimers.delete(id);
  }
}

function scheduleAutoDismiss(toast: UiFeedbackToast) {
  clearToastTimer(toast.id);
  if (toast.autoDismissMs === null) return;
  if (toast.autoDismissMs <= 0) return;
  toastTimers.set(
    toast.id,
    setTimeout(() => {
      uiFeedback.dismiss(toast.id);
    }, toast.autoDismissMs),
  );
}

function toSnapshot(current: InternalState): UiFeedbackSnapshot {
  return {
    toasts: current.toasts,
    activeConfirm: current.activeConfirm
      ? {
          id: current.activeConfirm.id,
          title: current.activeConfirm.title,
          message: current.activeConfirm.message,
          confirmLabel: current.activeConfirm.confirmLabel,
          cancelLabel: current.activeConfirm.cancelLabel,
          tone: current.activeConfirm.tone,
          createdAt: current.activeConfirm.createdAt,
        }
      : null,
  };
}

export const uiFeedback = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): UiFeedbackSnapshot {
    if (cachedSnapshotState === state && cachedSnapshot) return cachedSnapshot;
    cachedSnapshotState = state;
    cachedSnapshot = toSnapshot(state);
    return cachedSnapshot;
  },

  enqueue(input: {
    id?: string;
    type: UiFeedbackType;
    title?: string;
    message: string;
    actions?: UiFeedbackAction[];
    dismissible?: boolean;
    autoDismissMs?: number | null;
  }): string {
    const toast = normalizeToast(input);
    const nextToasts = [...state.toasts, toast].slice(-5);
    setState({ ...state, toasts: nextToasts });
    scheduleAutoDismiss(toast);
    return toast.id;
  },

  dismiss(id: string) {
    clearToastTimer(id);
    if (!state.toasts.some((toast) => toast.id === id)) return;
    setState({ ...state, toasts: state.toasts.filter((toast) => toast.id !== id) });
  },

  clearToasts() {
    for (const toast of state.toasts) clearToastTimer(toast.id);
    setState({ ...state, toasts: [] });
  },

  async confirm(options: UiFeedbackConfirmOptions): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const request: UiFeedbackConfirmRequest = {
        id: createId("confirm"),
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "确定",
        cancelLabel: options.cancelLabel ?? "取消",
        tone: options.tone ?? "default",
        createdAt: Date.now(),
        resolve,
      };

      if (!state.activeConfirm) {
        setState({ ...state, activeConfirm: request });
        return;
      }

      setState({ ...state, confirmQueue: [...state.confirmQueue, request] });
    });
  },

  respondToConfirm(value: boolean) {
    const active = state.activeConfirm;
    if (!active) return;

    const nextConfirm = state.confirmQueue[0] ?? null;
    const nextQueue = nextConfirm ? state.confirmQueue.slice(1) : [];
    setState({ ...state, activeConfirm: nextConfirm, confirmQueue: nextQueue });
    active.resolve(value);
  },

  clearAllForTest() {
    uiFeedback.clearToasts();
    state.activeConfirm?.resolve(false);
    for (const pending of state.confirmQueue) pending.resolve(false);
    setState({ toasts: [], activeConfirm: null, confirmQueue: [] });
  },
} as const;
