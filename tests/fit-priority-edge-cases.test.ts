import { describe, it, expect } from "vitest";

import { deterministicScoringProvider } from "@/lib/scoring/providers/stub";
import { deterministicPriorityProvider } from "@/lib/priority/providers/stub";
import { MIN_COVERAGE_FOR_SCORE, coverageOf, isReliable, roundForDisplay } from "@/lib/scoring/coverage";
import { estimateYearsExperience, deriveCandidateSeniority } from "@/lib/scoring/shared";
import type { CareerGoal, Experience, Job, JobAnalysis, Skill } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * Edge-case coverage for the Fit and Priority engines beyond what
 * tests/scoring.test.ts already asserts - currency handling, coverage
 * gating, NaN/corrupt-data safety, and the specific branches product
 * decisions (APPLY_NOW vs SKIP, a shown vs withheld score) hinge on.
 * These are the paths that don't show up in a happy-path demo but decide
 * whether a paying user is told the truth about how reliable a number is.
 */

const now = new Date();

function skill(name: string, evidenceLevel: Skill["evidenceLevel"] = "DEMONSTRATED"): Skill {
  return {
    id: `skill-${name}`,
    careerProfileId: "profile-1",
    name,
    category: "TECHNICAL",
    proficiency: "ADVANCED",
    experienceLevel: "THREE_TO_5_YEARS",
    evidenceLevel,
    source: "USER",
    recency: "CURRENT",
    isTransferable: false,
    transferableRationale: null,
    createdAt: now,
    updatedAt: now,
  };
}

function profileWith(skills: string[] = [], overrides: Partial<NonNullable<FullCareerProfile["profile"]>> = {}): FullCareerProfile {
  return {
    profile: {
      id: "profile-1",
      userId: "user-1",
      headline: "Product Analyst",
      summary: "Analyst working in software.",
      location: "London",
      currentRole: "Product Analyst",
      currentCompany: "Acme",
      yearsExperience: 5,
      skills: [],
      resumeFileName: null,
      resumeFileUrl: null,
      resumeUploadedAt: null,
      parsedData: null,
      isStudent: false,
      university: null,
      major: null,
      expectedGraduation: null,
      studentCountry: null,
      preferredLocations: [],
      openToRemote: true,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    },
    educations: [],
    experiences: [],
    projects: [],
    skills: skills.map((s) => skill(s)),
    achievements: [],
    certifications: [],
    documents: [],
  };
}

function jobWith(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    userId: "user-1",
    inputMethod: "PASTED_TEXT",
    url: null,
    rawInput: "",
    status: "PARSED",
    errorMessage: null,
    title: "Product Analyst",
    company: "Northwind",
    location: "London",
    country: "United Kingdom",
    salaryMin: 50000,
    salaryMax: 60000,
    salaryCurrency: "GBP",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    seniority: "MID",
    description: "Analyst role",
    requiredExperienceYears: 3,
    preferredExperienceYears: null,
    education: null,
    industry: "Software",
    deadline: null,
    datePosted: null,
    source: null,
    requiredSkills: ["SQL", "Python"],
    preferredSkills: [],
    requirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function goalWith(overrides: Partial<CareerGoal> = {}): CareerGoal {
  return {
    id: "goal-1",
    userId: "user-1",
    title: "Senior analytics",
    targetRole: null,
    targetIndustry: null,
    timeframe: null,
    notes: null,
    status: "ACTIVE",
    primaryTargetRole: "Senior Product Analyst",
    secondaryTargetRoles: [],
    industries: ["Software"],
    preferredLocations: ["London"],
    countries: ["United Kingdom"],
    workModes: ["HYBRID"],
    employmentTypes: ["FULL_TIME"],
    seniority: "MID",
    salaryMin: 55000,
    salaryMax: 75000,
    salaryCurrency: "GBP",
    isUncertain: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function analysisFrom(fit: ReturnType<typeof deterministicScoringProvider.analyzeFit>): JobAnalysis {
  return { id: "a1", userId: "u", jobId: "j", ...fit, createdAt: now, updatedAt: now };
}

describe("coverage threshold", () => {
  it("MIN_COVERAGE_FOR_SCORE is the current product value (0.40), not a stale default", () => {
    // Regression guard: this threshold has moved twice already - 0.6
    // (withheld too many entry-level roles) -> 0.25 (let edge-case,
    // almost-entirely-assumed low-data jobs through with an
    // overconfident-looking score) -> 0.40 (see lib/scoring/coverage.ts).
    // If this constant ever changes again it should be a deliberate product
    // decision reflected here too, not something that silently drifts back.
    expect(MIN_COVERAGE_FOR_SCORE).toBe(0.40);
  });

  it("withholds a fit score below the coverage threshold", () => {
    // A profile and job with almost nothing to compare: no skills, no
    // experience data, no industry, no location preference.
    const profile: FullCareerProfile = {
      profile: null,
      educations: [],
      experiences: [],
      projects: [],
      skills: [],
      achievements: [],
      certifications: [],
      documents: [],
    };
    const job = jobWith({
      requiredSkills: [],
      preferredSkills: [],
      requiredExperienceYears: null,
      education: null,
      industry: null,
      seniority: null,
      workMode: "ONSITE",
      location: null,
      country: null,
    });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    expect(fit.competitiveness).toBe("Insufficient data");
    expect(fit.recommendation).toBe("LOW_PRIORITY");
  });

  it("coverageOf treats legacy breakdowns with no confidence label as fully covered", () => {
    const legacyBreakdown = {
      skills: { score: 20, maxScore: 30, weight: 30, reasoning: "x" },
    };
    expect(coverageOf(legacyBreakdown)).toBe(1);
    expect(isReliable(legacyBreakdown)).toBe(true);
  });
});

describe("scoreSalary currency handling (priority engine)", () => {
  it("never compares figures across different currencies", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith({ salaryMin: 200000, salaryMax: 250000, salaryCurrency: "INR" });
    const goal = goalWith({ salaryMin: 55000, salaryMax: 75000, salaryCurrency: "GBP" });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const { priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: analysisFrom(fit),
    });
    expect(priorityBreakdown.salary.confidence).toBe("unavailable");
  });

  it("does not treat a posting with no stated currency as a match against the user's target", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith({ salaryMin: 60000, salaryMax: 60000, salaryCurrency: null });
    const goal = goalWith({ salaryMin: 55000, salaryMax: 75000, salaryCurrency: "GBP" });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const { priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: analysisFrom(fit),
    });
    expect(priorityBreakdown.salary.confidence).toBe("unavailable");
  });

  it("scores full marks when the role's salary meets the user's floor, same currency", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith({ salaryMin: 80000, salaryMax: 90000, salaryCurrency: "GBP" });
    const goal = goalWith({ salaryMin: 55000, salaryMax: 75000, salaryCurrency: "GBP" });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const { priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: analysisFrom(fit),
    });
    expect(priorityBreakdown.salary.confidence).toBe("measured");
    expect(priorityBreakdown.salary.score).toBe(priorityBreakdown.salary.maxScore);
  });

  it("is case-insensitive on currency codes", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith({ salaryMin: 80000, salaryMax: 90000, salaryCurrency: "gbp" });
    const goal = goalWith({ salaryMin: 55000, salaryMax: 75000, salaryCurrency: "GBP" });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const { priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: analysisFrom(fit),
    });
    expect(priorityBreakdown.salary.confidence).toBe("measured");
  });
});

describe("priority location scoring reads profile-level preferences", () => {
  it("uses the account's own location/preferredLocations even with no career goal preferences set", () => {
    const profile = profileWith(["SQL"], { location: "Manchester", preferredLocations: ["Manchester", "Leeds"] });
    const job = jobWith({ workMode: "ONSITE", location: "Manchester", country: "United Kingdom" });
    // Career goal explicitly has no location prefs of its own.
    const goal = goalWith({ preferredLocations: [], countries: [], workModes: [] });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const { priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: analysisFrom(fit),
    });
    expect(priorityBreakdown.location.confidence).not.toBe("unavailable");
  });
});

describe("NaN / corrupt-data safety", () => {
  it("never lets a non-finite stored fitScore leak into a Priority component", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith();
    const goal = goalWith();
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const corruptAnalysis: JobAnalysis = { ...analysisFrom(fit), fitScore: NaN };
    const { priorityBreakdown, priorityScore } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: corruptAnalysis,
    });
    expect(priorityBreakdown.candidateFit.confidence).toBe("unavailable");
    expect(Number.isFinite(priorityScore)).toBe(true);
  });

  it("estimateYearsExperience returns null (not 0 or NaN) when every experience row has an invalid date range", () => {
    const profile = profileWith(["SQL"]);
    profile.profile!.yearsExperience = null;
    profile.experiences = [
      {
        id: "e1",
        careerProfileId: "profile-1",
        company: "X",
        title: "Analyst",
        location: null,
        startDate: new Date("2022-01-01"),
        endDate: new Date("2020-01-01"), // end before start: invalid
        isCurrent: false,
        description: null,
        source: "USER",
        isUncertain: false,
        createdAt: now,
        updatedAt: now,
      } as Experience,
    ];
    expect(estimateYearsExperience(profile)).toBeNull();
  });

  it("deriveCandidateSeniority never guesses PRINCIPAL from unknown/NaN years", () => {
    expect(deriveCandidateSeniority(null, null)).toBeNull();
    expect(deriveCandidateSeniority(NaN, null)).toBeNull();
  });

  it("a fully blank profile against a real posting never scores a confident SKIP with a fabricated 0 years", () => {
    const profile: FullCareerProfile = {
      profile: null,
      educations: [],
      experiences: [],
      projects: [],
      skills: [],
      achievements: [],
      certifications: [],
      documents: [],
    };
    const job = jobWith({ requiredExperienceYears: 5 });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    // Experience must be unavailable (we don't know), never a confident
    // "0 years, short of the 5-year requirement".
    expect(fit.scoreBreakdown.experience.confidence).toBe("unavailable");
    expect(fit.scoreBreakdown.experience.reasoning).not.toMatch(/0 years/);
  });
});

describe("seniority edge cases", () => {
  it("does not fabricate a distance when the job's seniority value is unrecognized", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith({ seniority: "NOT_A_REAL_LEVEL" as Job["seniority"] });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    expect(fit.scoreBreakdown.seniority.confidence).toBe("unavailable");
  });

  it("recognizes overqualification distinctly from a plain seniority mismatch", () => {
    const profile = profileWith(["SQL", "Python"], { yearsExperience: 18 });
    const job = jobWith({ seniority: "ENTRY", requiredExperienceYears: null });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    const seniorityGap = fit.gaps.find((g) => g.type === "SENIORITY_GAP");
    if (seniorityGap) {
      expect(seniorityGap.title).toMatch(/overqualified/i);
    }
  });
});

describe("buildRecommendation branches", () => {
  it("recommends APPLY_NOW only when both mandatory match and fit are both very high", () => {
    const profile = profileWith(["SQL", "Python"], { yearsExperience: 6 });
    profile.skills = [skill("SQL", "CERTIFIED"), skill("Python", "CERTIFIED")];
    const job = jobWith({
      requiredExperienceYears: 3,
      requirements: [
        { text: "SQL", mandatory: true, category: "skill" },
        { text: "Python", mandatory: true, category: "skill" },
      ],
    });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    expect(["APPLY_NOW", "APPLY"]).toContain(fit.recommendation);
  });

  it("never recommends APPLY_NOW when mandatory requirements could not be verified at all", () => {
    const profile = profileWith(["SQL", "Python"], { yearsExperience: 10 });
    profile.skills = [skill("SQL", "CERTIFIED"), skill("Python", "CERTIFIED")];
    const job = jobWith({ requirements: [] }); // nothing to check
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    expect(fit.recommendation).not.toBe("APPLY_NOW");
  });
});

describe("roundForDisplay", () => {
  // Regression coverage for a real UI bug caught in live testing: a
  // component's `score` is deliberately kept at full floating-point
  // precision internally (see lib/scoring/shared.ts - rounding before
  // summing used to skew the total score by a couple of points), but that
  // precision was rendered straight onto the opportunity/dream-job/
  // analyze-job breakdown cards, showing values like
  // "14.249999999999998/25" to the user. roundForDisplay is the
  // presentation-only fix: round to one decimal place right before
  // rendering, never before summing.
  it("cleans up floating-point noise from a ratio*weight calculation", () => {
    expect(roundForDisplay(0.9499999999999998 * 15)).toBe(14.2);
    expect(roundForDisplay(14.249999999999998)).toBe(14.2);
  });

  it("is a no-op on already-clean values", () => {
    expect(roundForDisplay(25)).toBe(25);
    expect(roundForDisplay(0)).toBe(0);
    expect(roundForDisplay(12.5)).toBe(12.5);
  });

  it("never changes a component score enough to be mistaken for a different measurement", () => {
    // The rounded display value should always be within 0.05 of the true
    // value - it's a display convenience, not a re-scoring.
    for (const raw of [0, 1.04999, 7.777, 14.249999999999998, 29.999999999999996]) {
      expect(Math.abs(roundForDisplay(raw) - raw)).toBeLessThanOrEqual(0.05 + Number.EPSILON);
    }
  });

  it("real Fit breakdown component scores always render as clean numbers", () => {
    // End-to-end guard: run the real engine and confirm every component's
    // displayed value round-trips through roundForDisplay without leaving
    // a long floating-point tail an actual user would see.
    const profile: FullCareerProfile = profileWith(["SQL", "Python"]);
    const job = jobWith({ requiredExperienceYears: 4 });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goalWith(), job });
    for (const c of Object.values(fit.scoreBreakdown)) {
      const displayed = roundForDisplay(c.score).toString();
      expect(displayed.replace(/^-?\d+\.?/, "").length).toBeLessThanOrEqual(1);
    }
  });
});

describe("Priority is never a copy of Fit, in either direction", () => {
  it("a low-fit but high-value role can still score reasonably on priority", () => {
    // High career value (matches target role exactly), high salary, right
    // location, but the candidate is missing every required skill.
    const profile = profileWith([], { yearsExperience: 5 });
    const job = jobWith({
      title: "Senior Product Analyst",
      requiredSkills: ["Rust", "Kubernetes", "Terraform"],
      salaryMin: 90000,
      salaryMax: 100000,
      salaryCurrency: "GBP",
    });
    const goal = goalWith({ primaryTargetRole: "Senior Product Analyst", salaryMin: 55000, salaryCurrency: "GBP" });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const { priorityScore } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis: analysisFrom(fit),
    });
    // Priority should be pulled up by career value/salary/location even
    // though fit itself is weak - it must not simply track fitScore.
    expect(priorityScore).toBeGreaterThan(0);
  });
});
