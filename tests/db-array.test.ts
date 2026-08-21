import { describe, it, expect } from "vitest";

import { toArray } from "@/lib/db/array";

/**
 * Regression tests for a bug that reached a running production build:
 * saving a career goal made the Career Goals page crash with
 * "goal.workModes.map is not a function".
 *
 * The cause was that node-postgres returns custom ENUM array columns as the
 * raw literal string ('{}' or '{HYBRID,REMOTE}') rather than a JS array, and
 * a non-empty string sails past `?? []`. Nothing in the type system could see
 * it — the column really is WorkMode[] — so it needs a test at the boundary.
 */

describe("Postgres array columns", () => {
  it("passes a real array straight through", () => {
    expect(toArray(["HYBRID", "REMOTE"])).toEqual(["HYBRID", "REMOTE"]);
    expect(toArray([])).toEqual([]);
  });

  it("turns the empty-array literal into an empty array, not a string", () => {
    // THE bug: '{}' is truthy, so `?? []` left a string where .map was called.
    const value = toArray("{}");
    expect(Array.isArray(value)).toBe(true);
    expect(value).toEqual([]);
  });

  it("parses an enum array literal", () => {
    expect(toArray("{HYBRID,REMOTE}")).toEqual(["HYBRID", "REMOTE"]);
    expect(toArray("{FULL_TIME}")).toEqual(["FULL_TIME"]);
  });

  it("handles quoted elements containing commas", () => {
    expect(toArray('{"London, UK","Manchester"}')).toEqual(["London, UK", "Manchester"]);
  });

  it("handles escaped quotes inside an element", () => {
    expect(toArray('{"say \\"hi\\""}')).toEqual(['say "hi"']);
  });

  it("treats null and undefined as empty", () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
  });

  it("drops Postgres NULL elements rather than showing the word NULL", () => {
    expect(toArray("{A,NULL,B}")).toEqual(["A", "B"]);
  });

  it("never returns a non-array, whatever it is handed", () => {
    for (const input of [0, false, {}, "not an array", "", "  ", 12.5]) {
      expect(Array.isArray(toArray(input))).toBe(true);
    }
  });
});
