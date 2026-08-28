import { describe, it, expect } from "vitest";

import { searchJobs, type SearchContext } from "@/lib/search/engine";
import { localEmbed, jobEmbeddingText, profileEmbeddingText } from "@/lib/search/embeddings";
import type { DiscoveredJob, CareerGoal } from "@/lib/db/types";

function careerGoal(overrides: Partial<CareerGoal> = {}): CareerGoal {
  return {
    id: "goal-1",
    userId: "user-1",
    title: "Career goal",
    targetRole: null,
    targetIndustry: null,
    timeframe: null,
    notes: null,
    status: "ACTIVE",
    primaryTargetRole: null,
    secondaryTargetRoles: [],
    industries: [],
    preferredLocations: [],
    countries: [],
    workModes: [],
    employmentTypes: [],
    seniority: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    isUncertain: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Regression coverage for a real user complaint: "Top Picks weren't
 * showing up, and Explore/vibe search felt fake and unusable." Nothing in
 * this file existed before that complaint - the search engine that backs
 * all three of Discovery's headline features (Top Picks, Standard Search,
 * Brainstorm/Explore) had zero direct test coverage.
 */

let counter = 0;
function job(overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  counter += 1;
  const base: DiscoveredJob = {
    id: `job-${counter}`,
    userId: "user-1",
    sourceConfigId: null,
    sourceKind: "PUBLIC_JOB_BOARD",
    sourceName: "Test Board",
    sourceUrl: null,
    externalId: `ext-${counter}`,
    discoveredAt: new Date(),
    postedAt: new Date(),
    title: "Sustainability Analyst",
    company: "Acme Corp",
    location: "Remote",
    country: "US",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: "FULL_TIME",
    workMode: "REMOTE",
    seniority: "MID",
    industry: null,
    description: "Track and report on ESG metrics, carbon accounting, and renewable energy programs.",
    requiredSkills: ["ESG reporting", "Carbon accounting"],
    preferredSkills: [],
    requirements: [],
    dedupeKey: `dedupe-${counter}`,
    duplicateOfId: null,
    embedding: [],
    embeddingModel: null,
    fitScore: 72,
    fitCoverage: null,
    recommendation: "APPLY",
    matchReasons: [],
    discoveryReason: null,
    isDismissed: false,
    convertedOpportunityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const merged = { ...base, ...overrides };
  merged.embedding = localEmbed(jobEmbeddingText(merged));
  return merged;
}

function context(overrides: Partial<SearchContext> = {}): SearchContext {
  const profileText =
    overrides.profileText ??
    "Sustainability coordinator. ESG reporting, carbon accounting, renewable energy policy.";
  const profileEmbedding =
    overrides.profileEmbedding ??
    localEmbed(
      profileEmbeddingText({
        headline: "Sustainability Coordinator",
        summary: profileText,
        currentRole: "Sustainability Coordinator",
        skills: ["ESG reporting", "Carbon accounting"],
        experienceTitles: [],
        projectNames: [],
      }),
    );
  return {
    profileText,
    profileEmbedding,
    profileSkills: ["ESG reporting", "Carbon accounting"],
    candidateSeniority: "MID",
    careerGoal: null,
    profileLocation: null,
    profileValues: [],
    ...overrides,
  };
}

describe("searchJobs — the engine behind Top Picks / Standard Search / Explore", () => {
  it("with an empty query (the Top Picks baseline), still returns a strongly relevant job's score above the 0.65 floor discovery-board.tsx filters on", () => {
    // This is exactly what discovery-board.tsx's topPicks computes: BALANCED
    // mode, empty query. A well-matched job (skills overlap, remote,
    // relevant title/description) should clear the floor Top Picks filters
    // on, or Top Picks is empty even when good matches exist.
    const result = searchJobs({
      jobs: [job()],
      query: "",
      context: context(),
      limit: 10,
      mode: "BALANCED",
    });
    expect(result.results[0].score).toBeGreaterThanOrEqual(0.65);
  });

  it("EXPLORE mode surfaces a job via role-graph expansion, not just literal keyword or lexical overlap", () => {
    // "urban planning and climate" shares zero literal words with
    // "Sustainability Analyst" - this only works if role-graph expansion
    // actually contributes to the score in EXPLORE mode, which it did not
    // before the WEIGHTS.EXPLORE.keyword fix (it was 0, discarding
    // expansion entirely regardless of what expandQuery found).
    const climateJob = job({
      title: "Sustainability Analyst",
      description: "ESG metrics tracking and renewable energy program coordination.",
    });
    const result = searchJobs({
      jobs: [climateJob],
      query: "urban planning and climate",
      context: context(),
      limit: 10,
      mode: "EXPLORE",
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].viaExpansion).not.toBeNull();
  });

  it("does not penalize a remote job for a candidate who typed a free-text city, not a country", () => {
    // Regression guard for the "Remote, but restricted to X" bug: a
    // candidate whose profileLocation is a free-text city (e.g. "Austin,
    // TX") used to get an incorrect 50% penalty on every remote US job,
    // because the old code guessed a country by checking whether that
    // location string literally contained the job's country code - and
    // "Austin, TX" never contains "US" as a substring. With no
    // careerGoal.countries set (the realistic case for most users), the
    // job should score at full remote compatibility, not get penalized.
    const remoteJob = job({ workMode: "REMOTE", country: "US" });
    const result = searchJobs({
      jobs: [remoteJob],
      query: "",
      context: context({ profileLocation: "Austin, TX", careerGoal: null }),
      limit: 10,
      mode: "BALANCED",
    });
    expect(result.results[0].score).toBeGreaterThanOrEqual(0.65);
    expect(result.results[0].reasons.join(" ")).not.toContain("Remote, but restricted to");
  });

  it("still flags a remote job as restricted when the candidate's structured country preference genuinely excludes it", () => {
    // The fix removes the free-text guess, but the real, structured signal
    // (careerGoal.countries, from an actual country picker) must still
    // work - otherwise the guard above could be masking a case where the
    // check just never fires at all.
    const remoteJob = job({ workMode: "REMOTE", country: "US" });
    const result = searchJobs({
      jobs: [remoteJob],
      query: "",
      context: context({
        profileLocation: "Berlin, Germany",
        careerGoal: careerGoal({ countries: ["Germany"] }),
      }),
      limit: 10,
      mode: "BALANCED",
    });
    expect(result.results[0].reasons.join(" ")).toContain("Remote, but restricted to US");
  });

  it("the profile-overlap reason is phrased as language overlap, not an unverifiable claim about work style or values", () => {
    // Regression guard for the "feels fake" complaint: this reason used to
    // read "Strong match with your background and work style," which the
    // underlying signal (hashed bag-of-words cosine similarity - see
    // embeddings.ts) cannot actually assess.
    const overlapping = job({
      description: "ESG reporting, carbon accounting, renewable energy policy, sustainability coordinator work.",
    });
    const result = searchJobs({ jobs: [overlapping], query: "", context: context(), limit: 10, mode: "BALANCED" });
    const reasons = result.results[0].reasons.join(" ");
    expect(reasons).not.toContain("work style");
    if (reasons.includes("Shares notable language")) {
      expect(reasons).toContain("Shares notable language with your profile");
    }
  });
});

describe("Values & Culture Matching", () => {
  it("scores a climate-focused job higher than an equivalent job with no stated culture, for a candidate whose CV supports sustainability_climate", () => {
    // This is the user's own example: someone whose CV shows real
    // sustainability/climate work should see a green-tech role rank above
    // an otherwise-equivalent role that states no particular culture.
    const climateJob = job({
      title: "Data Analyst",
      description: "Support our climate strategy team with carbon accounting and renewable energy reporting.",
      requiredSkills: ["SQL"],
    });
    const genericJob = job({
      title: "Data Analyst",
      description: "Support the finance team with reporting and analysis.",
      requiredSkills: ["SQL"],
    });

    const ctx = context({ profileValues: [{ value: "sustainability_climate", confidence: 0.8 }] });
    const result = searchJobs({ jobs: [climateJob, genericJob], query: "", context: ctx, limit: 10, mode: "BALANCED" });

    const climateResult = result.results.find((r) => r.job.id === climateJob.id)!;
    const genericResult = result.results.find((r) => r.job.id === genericJob.id)!;

    expect(climateResult.score).toBeGreaterThan(genericResult.score);
    expect(climateResult.components.values).toBe(1);
    expect(genericResult.components.values).toBe(0.5);
  });

  it("explains the match in the reasoning text, by name", () => {
    const climateJob = job({
      description: "Our mission is measurable climate impact - carbon accounting and renewable energy at scale.",
    });
    const ctx = context({ profileValues: [{ value: "sustainability_climate", confidence: 0.8 }] });
    const result = searchJobs({ jobs: [climateJob], query: "", context: ctx, limit: 10, mode: "BALANCED" });
    expect(result.results[0].reasons[0]).toContain("Aligns with your interest in");
    expect(result.results[0].reasons[0].toLowerCase()).toContain("sustainability");
  });

  it("stays neutral (0.5) for a candidate with no recorded values, never inventing a boost or a penalty", () => {
    const climateJob = job({ description: "Climate strategy, carbon accounting, renewable energy." });
    const result = searchJobs({ jobs: [climateJob], query: "", context: context({ profileValues: [] }), limit: 10, mode: "BALANCED" });
    expect(result.results[0].components.values).toBe(0.5);
  });

  it("stays neutral (0.5) for a job that states no culture signal at all, even for a candidate with strong recorded values", () => {
    const plainJob = job({ title: "Data Analyst", description: "Analyze data and build dashboards.", requiredSkills: [] });
    const ctx = context({ profileValues: [{ value: "sustainability_climate", confidence: 0.9 }] });
    const result = searchJobs({ jobs: [plainJob], query: "", context: ctx, limit: 10, mode: "BALANCED" });
    expect(result.results[0].components.values).toBe(0.5);
  });

  it("mildly penalizes a job that states a *different* culture than the one the candidate's CV supports", () => {
    const startupJob = job({
      title: "Data Analyst",
      description: "Scrappy early-stage startup, wear many hats, move fast.",
      requiredSkills: [],
    });
    const ctx = context({ profileValues: [{ value: "sustainability_climate", confidence: 0.9 }] });
    const result = searchJobs({ jobs: [startupJob], query: "", context: ctx, limit: 10, mode: "BALANCED" });
    expect(result.results[0].components.values).toBe(0.4);
  });
});
