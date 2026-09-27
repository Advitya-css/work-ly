import { describe, expect, it } from "vitest";

import { trimReason } from "@/lib/email";

describe("trimReason", () => {
  it("keeps short text as is", () => {
    expect(trimReason("Strong dbt match.", 220)).toBe("Strong dbt match.");
  });
  it("ends at a full sentence instead of mid-sentence", () => {
    const text =
      "You have solid, long-standing experience in private music instruction and live performance in Austin. Your background aligns well with part-time music education roles, provided the schedule fits.";
    const out = trimReason(text, 150);
    expect(out).toBe("You have solid, long-standing experience in private music instruction and live performance in Austin.");
  });
  it("falls back to a whole word with an ellipsis", () => {
    const out = trimReason("word ".repeat(80), 100);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(101);
  });
});
