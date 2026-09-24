import { describe, expect, it } from "vitest";

import { pickScreenCandidates, titleAffinity } from "@/lib/discovery/screen-pick";
import type { DiscoveredJob } from "@/lib/db/types";

const NOW = new Date("2026-09-24T12:00:00Z").getTime();
const LONG = "We are hiring. ".repeat(20);

function job(id: string, overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    id,
    userId: "u",
    sourceConfigId: null,
    sourceKind: "COMPANY_CAREER",
    sourceName: "Board",
    sourceUrl: null,
    externalId: id,
    discoveredAt: new Date(NOW),
    postedAt: new Date(NOW),
    title: "Data Analyst",
    company: "Co",
    location: null,
    country: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: null,
    workMode: null,
    seniority: null,
    industry: null,
    description: LONG,
    requiredSkills: [],
    preferredSkills: [],
    requirements: [],
    dedupeKey: id,
    duplicateOfId: null,
    embedding: [],
    embeddingModel: null,
    fitScore: 50,
    fitCoverage: null,
    recommendation: "STRETCH",
    matchReasons: [],
    discoveryReason: null,
    isDismissed: false,
    convertedOpportunityId: null,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  } as DiscoveredJob;
}

describe("titleAffinity", () => {
  it("scores the share of a target's field words in the title", () => {
    expect(titleAffinity("Senior Analytics Engineer", ["Analytics Engineer"])).toBe(1);
    expect(titleAffinity("Data Engineer", ["Analytics Engineer"])).toBe(0);
    expect(titleAffinity("Data Analyst II", ["Analytics Engineer", "Data Analyst"])).toBe(1);
  });
});

describe("pickScreenCandidates", () => {
  const targets = ["Analytics Engineer", "Data Analyst"];

  it("puts a relevant summary-scored title ahead of an irrelevant higher rules score", () => {
    const jobs = [
      job("irrelevant", { title: "Cybersecurity Specialist", fitScore: 70, recommendation: "STRETCH" }),
      job("relevant", { title: "Senior Analytics Engineer", fitScore: null, recommendation: "STRETCH" }),
    ];
    const { toScreen } = pickScreenCandidates(jobs, { targets, fingerprint: "f", limit: 1, now: NOW });
    expect(toScreen.map((j) => j.id)).toEqual(["relevant"]);
  });

  it("skips jobs already screened for this profile, dismissed, duplicate or too short to read", () => {
    const jobs = [
      job("done", { matchReasons: [{ kind: "screen", text: "x", meta: "f" }] }),
      job("stale", { matchReasons: [{ kind: "screen", text: "x", meta: "old" }] }),
      job("dismissed", { isDismissed: true }),
      job("dup", { duplicateOfId: "done" }),
      job("short", { description: "Two lines." }),
    ];
    const { toScreen, remaining } = pickScreenCandidates(jobs, { targets, fingerprint: "f", limit: 5, now: NOW });
    expect(toScreen.map((j) => j.id)).toEqual(["stale"]);
    expect(remaining).toBe(0);
  });

  it("reports what is left inside the window", () => {
    const jobs = Array.from({ length: 10 }, (_, i) => job(`j${i}`));
    const pick = pickScreenCandidates(jobs, { targets, fingerprint: "f", limit: 3, window: 6, now: NOW });
    expect(pick.toScreen).toHaveLength(3);
    expect(pick.remaining).toBe(3);
  });
});
