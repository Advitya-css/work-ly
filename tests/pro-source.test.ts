import { describe, expect, it } from "vitest";

import { groupOf, proSource } from "@/lib/pro-source";

const now = new Date("2026-10-03T00:00:00Z");
const later = "2026-12-01T00:00:00Z";
const base = { isPro: true, proPlan: null, proUntil: later, codeUsed: null, hasPaid: false };

describe("how someone got Pro", () => {
  it("tells paid plans from plans with no payment on record", () => {
    expect(proSource({ ...base, proPlan: "quarterly", hasPaid: true }, now).label).toBe("Paid · 3-Month Pass");
    expect(proSource({ ...base, proPlan: "yearly" }, now).kind).toBe("unknown");
  });

  it("names the code for seats, gifts, free passes and beta codes", () => {
    expect(proSource({ ...base, proPlan: "seat", codeUsed: "TEAM-AB12CD34#003" }, now)).toEqual({
      kind: "seat",
      label: "Seat code (coach or cohort)",
      detail: "TEAM-AB12CD34",
    });
    expect(proSource({ ...base, proPlan: "seat", codeUsed: "GIFT-AB12CD34#001" }, now).kind).toBe("gift");
    expect(proSource({ ...base, proPlan: "seat", codeUsed: "PASS-QCD6DMSF#001" }, now).label).toBe("Free pass from you");
    expect(proSource({ ...base, proPlan: "beta", codeUsed: "BETA-1A2B3C4D" }, now).detail).toBe("BETA-1A2B3C4D");
    expect(proSource({ ...base, proPlan: "beta" }, now).label).toContain("Universal code");
  });

  it("covers the Sprint, the trial, expired and free accounts", () => {
    expect(proSource({ ...base, proPlan: "sprint" }, now).kind).toBe("sprint");
    expect(proSource({ ...base, proPlan: "trial" }, now).kind).toBe("trial");
    expect(proSource({ ...base, proPlan: "quarterly", hasPaid: true, proUntil: "2026-09-01T00:00:00Z" }, now).label).toBe(
      "Paid before, Pro ended",
    );
    expect(proSource({ ...base, isPro: false }, now).kind).toBe("free");
    expect(proSource({ ...base }, now).kind).toBe("unknown");
  });

  it("reads the group code off a seat row", () => {
    expect(groupOf("TEAM-AB12CD34#003")).toBe("TEAM-AB12CD34");
    expect(groupOf("BETA-1A2B3C4D")).toBe("BETA-1A2B3C4D");
  });
});
