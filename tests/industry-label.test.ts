import { describe, expect, it } from "vitest";

import { isRealIndustry } from "@/lib/scoring/providers/stub";

describe("isRealIndustry", () => {
  it("ignores job-board category labels", () => {
    for (const v of ["IT Jobs", "Other/General Jobs", "Accounting & Finance Jobs", "IT", " other ", "", null, undefined]) {
      expect(isRealIndustry(v)).toBe(false);
    }
  });
  it("keeps real industries", () => {
    for (const v of ["fintech", "Healthcare", "Asset & Wealth Management", "E-commerce"]) {
      expect(isRealIndustry(v)).toBe(true);
    }
  });
});
