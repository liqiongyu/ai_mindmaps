export type History<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function commitHistory<T>(history: History<T>, nextPresent: T, maxPast: number): History<T> {
  const nextPast = [...history.past, history.present];
  const boundedPast =
    nextPast.length > maxPast ? nextPast.slice(nextPast.length - maxPast) : nextPast;
  return { past: boundedPast, present: nextPresent, future: [] };
}

export function undoHistory<T>(history: History<T>): History<T> | null {
  if (history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1];
  const nextPast = history.past.slice(0, -1);
  return { past: nextPast, present: previous, future: [history.present, ...history.future] };
}

export function redoHistory<T>(history: History<T>): History<T> | null {
  if (history.future.length === 0) return null;
  const [next, ...rest] = history.future;
  return { past: [...history.past, history.present], present: next, future: rest };
}
