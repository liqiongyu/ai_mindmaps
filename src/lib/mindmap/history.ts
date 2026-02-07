export type History<T> = {
  past: T[];
  pastIds: number[];
  present: T;
  presentId: number;
  future: T[];
  futureIds: number[];
  nextId: number;
};

export function createHistory<T>(present: T): History<T> {
  return {
    past: [],
    pastIds: [],
    present,
    presentId: 0,
    future: [],
    futureIds: [],
    nextId: 1,
  };
}

export function commitHistory<T>(history: History<T>, nextPresent: T, maxPast: number): History<T> {
  const nextPast = [...history.past, history.present];
  const nextPastIds = [...history.pastIds, history.presentId];

  const overflow = nextPast.length - maxPast;
  const boundedPast = overflow > 0 ? nextPast.slice(overflow) : nextPast;
  const boundedPastIds = overflow > 0 ? nextPastIds.slice(overflow) : nextPastIds;

  return {
    past: boundedPast,
    pastIds: boundedPastIds,
    present: nextPresent,
    presentId: history.nextId,
    future: [],
    futureIds: [],
    nextId: history.nextId + 1,
  };
}

export function undoHistory<T>(history: History<T>): History<T> | null {
  if (history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1];
  const previousId = history.pastIds[history.pastIds.length - 1];
  const nextPast = history.past.slice(0, -1);
  const nextPastIds = history.pastIds.slice(0, -1);
  return {
    past: nextPast,
    pastIds: nextPastIds,
    present: previous,
    presentId: previousId,
    future: [history.present, ...history.future],
    futureIds: [history.presentId, ...history.futureIds],
    nextId: history.nextId,
  };
}

export function redoHistory<T>(history: History<T>): History<T> | null {
  if (history.future.length === 0) return null;
  const [next, ...rest] = history.future;
  const [nextId, ...restIds] = history.futureIds;
  return {
    past: [...history.past, history.present],
    pastIds: [...history.pastIds, history.presentId],
    present: next,
    presentId: nextId,
    future: rest,
    futureIds: restIds,
    nextId: history.nextId,
  };
}

export function travelHistoryToPresentId<T>(
  history: History<T>,
  targetPresentId: number,
): History<T> | null {
  if (history.presentId === targetPresentId) return history;

  const pastIndex = history.pastIds.lastIndexOf(targetPresentId);
  if (pastIndex !== -1) {
    let next = history;
    const steps = history.pastIds.length - pastIndex;
    for (let i = 0; i < steps; i += 1) {
      const undone = undoHistory(next);
      if (!undone) return null;
      next = undone;
    }
    return next.presentId === targetPresentId ? next : null;
  }

  const futureIndex = history.futureIds.indexOf(targetPresentId);
  if (futureIndex !== -1) {
    let next = history;
    for (let i = 0; i <= futureIndex; i += 1) {
      const redone = redoHistory(next);
      if (!redone) return null;
      next = redone;
    }
    return next.presentId === targetPresentId ? next : null;
  }

  return null;
}
