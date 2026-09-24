import { describe, expect, it } from "vitest";

import { buildMarketValue, formatMoney, risingSkills } from "@/lib/insights/market-value";
import { hasYearlyPerks, planForVariant } from "@/lib/plans";
import type { DiscoveredJob } from "@/lib/db/types";

const NOW = new Date("2026-09-24T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function job(id: string, overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    id, userId: "u", sourceConfigId: null, sourceKind: "LICENSED_API", sourceName: "Adzuna", sourceUrl: null,
    externalId: id, discoveredAt: new Date(NOW - DAY), postedAt: new Date(NOW - DAY), title: "Data Analyst",
    company: "Co", location: null, country: "India", salaryMin: null, salaryMax: null, salaryCurrency: null,
    employmentType: null, workMode: null, seniority: null, industry: null, description: null, requiredSkills: [],
    preferredSkills: [], requirements: [], dedupeKey: id, duplicateOfId: null, embedding: [], embeddingModel: null,
    fitScore: 60, fitCoverage: null, recommendation: "STRETCH", matchReasons: [], discoveryReason: null,
    isDismissed: false, convertedOpportunityId: null, createdAt: new Date(NOW), updatedAt: new Date(NOW),
    ...overrides,
  } as DiscoveredJob;
}

describe("plans", () => {
  it("unlocks yearly perks for yearly and beta Pro only", () => {
    expect(hasYearlyPerks({ isPro: true, proPlan: "yearly" })).toBe(true);
    expect(hasYearlyPerks({ isPro: true, proPlan: "beta" })).toBe(true);
    expect(hasYearlyPerks({ isPro: true, proPlan: "quarterly" })).toBe(false);
    expect(hasYearlyPerks({ isPro: true, proPlan: null })).toBe(false);
    expect(hasYearlyPerks({ isPro: false, proPlan: "yearly" })).toBe(false);
  });
  it("maps checkout variants to plans", () => {
    const env = { LEMON_SQUEEZY_YEARLY_VARIANT_ID: "3", LEMON_SQUEEZY_QUARTERLY_VARIANT_ID: "2" };
    expect(planForVariant("3", env)).toBe("yearly");
    expect(planForVariant("2", env)).toBe("quarterly");
    expect(planForVariant("1", env)).toBe("monthly");
    expect(planForVariant(undefined, env)).toBe("monthly");
  });
});

describe("buildMarketValue", () => {
  const targets = ["Analytics Engineer", "Data Analyst"];
  const paid = (id: string, min: number, max: number, extra: Partial<DiscoveredJob> = {}) =>
    job(id, { salaryMin: min, salaryMax: max, salaryCurrency: "INR", ...extra });

  it("gives quartiles from relevant listings with a stated salary", () => {
    const jobs = [
      paid("a", 1_000_000, 1_400_000),
      paid("b", 1_200_000, 1_600_000),
      paid("c", 1_500_000, 1_900_000),
      paid("d", 1_800_000, 2_200_000),
      paid("e", 2_400_000, 3_000_000),
      paid("irrelevant", 9_000_000, 9_900_000, { title: "Cybersecurity Specialist" }),
      job("nopay"),
    ];
    const value = buildMarketValue(jobs, targets, NOW);
    expect(value.currency).toBe("INR");
    expect(value.sample).toBe(5);
    expect(value.median).toBe(1_700_000);
    expect(value.low).toBeLessThan(value.median!);
    expect(value.high).toBeGreaterThan(value.median!);
    expect(value.topPaying[0].max).toBe(3_000_000);
  });

  it("withholds a range below the minimum sample and ignores other currencies and old listings", () => {
    const jobs = [
      paid("a", 1, 2),
      paid("b", 1, 2),
      paid("usd", 100, 200, { salaryCurrency: "USD" }),
      paid("old", 1, 2, { postedAt: new Date(NOW - 200 * DAY) }),
    ];
    const value = buildMarketValue(jobs, targets, NOW);
    expect(value.sample).toBe(2);
    expect(value.median).toBeNull();
  });

  it("formats rupees with Indian grouping", () => {
    expect(formatMoney(1_800_000, "INR")).toBe("₹18,00,000");
  });
});

describe("risingSkills", () => {
  it("finds skills asked for more often lately", () => {
    const recent = Array.from({ length: 10 }, (_, i) =>
      job(`r${i}`, { postedAt: new Date(NOW - 5 * DAY), requiredSkills: i < 6 ? ["dbt", "sql"] : ["sql"] }),
    );
    const earlier = Array.from({ length: 10 }, (_, i) =>
      job(`e${i}`, { postedAt: new Date(NOW - 50 * DAY), requiredSkills: i < 1 ? ["dbt", "sql"] : ["sql"] }),
    );
    const rising = risingSkills([...recent, ...earlier], ["Data Analyst"], NOW);
    expect(rising.map((r) => r.skill)).toEqual(["dbt"]);
    expect(rising[0].recentShare).toBeCloseTo(0.6);
  });
  it("needs enough listings in both windows", () => {
    expect(risingSkills([job("x", { requiredSkills: ["dbt"] })], ["Data Analyst"], NOW)).toEqual([]);
  });
});
