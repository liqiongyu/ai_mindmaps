import { describe, expect, it } from "vitest";

import { makeMindmapExportFilename } from "./export";

describe("mindmap/export", () => {
  it("uses demo filename when mindmapId is null", () => {
    expect(makeMindmapExportFilename({ format: "png", mindmapId: null })).toBe("mindmap-demo.png");
  });

  it("uses mindmapId in filename", () => {
    expect(makeMindmapExportFilename({ format: "svg", mindmapId: "abc" })).toBe("mindmap-abc.svg");
  });
});
