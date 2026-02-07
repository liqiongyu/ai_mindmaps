import { describe, expect, it } from "vitest";

import {
  commitHistory,
  createHistory,
  redoHistory,
  travelHistoryToPresentId,
  undoHistory,
} from "./history";

describe("mindmap/history", () => {
  it("commits create undo history and clear redo history", () => {
    const h1 = createHistory(1);
    const h2 = commitHistory(h1, 2, 50);
    const h3 = undoHistory(h2);
    expect(h3).not.toBeNull();
    if (!h3) return;

    const h4 = commitHistory(h3, 3, 50);
    expect(h4.past).toEqual([1]);
    expect(h4.pastIds).toEqual([0]);
    expect(h4.present).toBe(3);
    expect(h4.presentId).toBe(2);
    expect(h4.future).toEqual([]);
    expect(h4.futureIds).toEqual([]);
  });

  it("supports undo/redo", () => {
    const h1 = createHistory("a");
    const h2 = commitHistory(h1, "b", 50);
    const h3 = commitHistory(h2, "c", 50);

    const hUndo1 = undoHistory(h3);
    expect(hUndo1?.present).toBe("b");
    expect(hUndo1?.presentId).toBe(1);

    const hUndo2 = hUndo1 ? undoHistory(hUndo1) : null;
    expect(hUndo2?.present).toBe("a");
    expect(hUndo2?.presentId).toBe(0);

    const hRedo1 = hUndo2 ? redoHistory(hUndo2) : null;
    expect(hRedo1?.present).toBe("b");
    expect(hRedo1?.presentId).toBe(1);

    const hRedo2 = hRedo1 ? redoHistory(hRedo1) : null;
    expect(hRedo2?.present).toBe("c");
    expect(hRedo2?.presentId).toBe(2);
  });

  it("bounds past history", () => {
    let history = createHistory(0);
    for (let i = 1; i <= 10; i += 1) {
      history = commitHistory(history, i, 3);
    }
    expect(history.past).toEqual([7, 8, 9]);
    expect(history.pastIds).toEqual([7, 8, 9]);
    expect(history.present).toBe(10);
    expect(history.presentId).toBe(10);
  });

  it("travels to past and future by id", () => {
    let history = createHistory("a");
    history = commitHistory(history, "b", 50);
    history = commitHistory(history, "c", 50);
    history = commitHistory(history, "d", 50);

    const travelToB = travelHistoryToPresentId(history, 1);
    expect(travelToB?.present).toBe("b");
    expect(travelToB?.presentId).toBe(1);

    const travelToD = travelToB ? travelHistoryToPresentId(travelToB, 3) : null;
    expect(travelToD?.present).toBe("d");
    expect(travelToD?.presentId).toBe(3);
  });
});
