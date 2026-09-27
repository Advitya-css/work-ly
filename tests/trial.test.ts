import { describe, expect, it } from "vitest";

import { TRIAL_HOURS, TRIAL_TOOL_LIMIT } from "@/lib/payments/trial";

describe("trial settings", () => {
  it("is one day with a small tool cap", () => {
    expect(TRIAL_HOURS).toBe(24);
    expect(TRIAL_TOOL_LIMIT).toBe(5);
  });
});
