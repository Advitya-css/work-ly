import { describe, expect, it } from "vitest";

import { buildMarketRadar } from "@/lib/discovery/market-radar";
import { requirementCore } from "@/lib/text-utils";
import type { DiscoveredJob, Skill } from "@/lib/db/types";

const now = Date.now();
function job(i: number, title: string, required: string[], recommendation: DiscoveredJob["recommendation"] = "STRETCH"): DiscoveredJob {
  return {
    id: `j${i}`, userId: "u", sourceConfigId: null, sourceKind: "API_PROVIDER", sourceName: "Test", sourceUrl: null,
    externalId: `e${i}`, discoveredAt: new Date(now - i * 86_400_000), postedAt: new Date(now - i * 86_400_000),
    title, company: "Co", location: null, country: null, salaryMin: null, salaryMax: null, salaryCurrency: null,
    employmentType: null, workMode: null, seniority: null, industry: null, description: null,
    requiredSkills: required, preferredSkills: [], requirements: [], dedupeKey: `k${i}`, duplicateOfId: null,
    embedding: [], embeddingModel: null, fitScore: 60, fitCoverage: 0.8, recommendation, matchReasons: [],
    discoveryReason: null, isDismissed: false, convertedOpportunityId: null, createdAt: new Date(), updatedAt: new Date(),
  };
}
function skill(name: string, evidenceLevel: Skill["evidenceLevel"]): Skill {
  return { id: name, careerProfileId: "p", name, category: "TECHNICAL" as Skill["category"], proficiency: null, experienceLevel: null, evidenceLevel, source: "USER" as Skill["source"], recency: "CURRENT" as Skill["recency"], isTransferable: false, transferableRationale: null, createdAt: new Date(), updatedAt: new Date() };
}

describe("requirementCore", () => {
  it("strips filler around the skill", () => {
    expect(requirementCore("Strong experience with Kubernetes")).toBe(requirementCore("Kubernetes"));
    expect(requirementCore("3+ years of SQL")).toBe("sql");
    expect(requirementCore("Experience with a cloud data warehouse (BigQuery, Snowflake)")).toBe("cloud data warehouse");
  });
});

describe("market radar", () => {
  const jobs = [
    job(1, "Data Analyst", ["Expert SQL", "Tableau", "Python"]),
    job(2, "Senior Data Analyst", ["SQL", "Tableau", "Looker"]),
    job(3, "Data Analyst", ["Strong SQL", "Excel"]),
    job(4, "Product Analyst", ["SQL", "Python", "A/B testing"]),
    job(5, "Data Analyst II", ["SQL", "Tableau"]),
    job(6, "Analytics Analyst", ["Python", "SQL"]),
    job(7, "Chef", ["Knife skills"], "SKIP"),
  ];

  it("counts real postings and ranks the most-asked skills first", () => {
    const radar = buildMarketRadar({ jobs, skills: [skill("SQL", "DEMONSTRATED"), skill("Python", "STATED")], targetRole: "Data Analyst", now });
    expect(radar.sampleSize).toBe(6);
    expect(radar.items[0].skill.toLowerCase()).toContain("sql");
    expect(radar.items[0].count).toBe(6);
    expect(radar.items[0].status).toBe("shown");
    expect(radar.items.find((i) => i.skill === "Python")?.status).toBe("listed");
    expect(radar.items.find((i) => i.skill === "Tableau")?.status).toBe("missing");
    // A skill only one posting mentions isn't a market signal.
    expect(radar.items.find((i) => i.skill === "Looker")).toBeUndefined();
  });

  it("ignores postings older than the window and unrelated SKIP jobs", () => {
    const old = { ...job(8, "Data Analyst", ["Tableau"]), postedAt: new Date(now - 90 * 86_400_000) };
    const radar = buildMarketRadar({ jobs: [...jobs, old], skills: [], targetRole: "Data Analyst", now });
    expect(radar.sampleSize).toBe(6);
  });
});
