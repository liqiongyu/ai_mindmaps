import { describe, expect, test } from "vitest";

import { parseFirstJsonObject } from "./json";

describe("parseFirstJsonObject", () => {
  test("parses a raw JSON object", () => {
    expect(parseFirstJsonObject('{"ok":true}')).toEqual({ ok: true });
  });

  test("parses a fenced JSON object", () => {
    expect(parseFirstJsonObject('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  test("extracts the first JSON object from prose", () => {
    expect(parseFirstJsonObject('Here you go:\n\n{"ok":true}\n\nThanks')).toEqual({ ok: true });
  });
});
