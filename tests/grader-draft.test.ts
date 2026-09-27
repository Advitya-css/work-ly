import { describe, expect, it } from "vitest";

import { draftJobLabel } from "@/lib/grader-draft";

describe("draftJobLabel", () => {
  it("uses the first meaningful line of the job", () => {
    expect(draftJobLabel("\n\nData & Analytics Engineer - AM\nBangalore")).toBe("Data & Analytics Engineer - AM");
    expect(draftJobLabel("")).toBe("the job you checked");
    expect(draftJobLabel("x".repeat(100)).length).toBeLessThanOrEqual(70);
  });
});
