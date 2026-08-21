import { describe, it, expect } from "vitest";

import { deterministicScoringProvider } from "@/lib/scoring/providers/stub";
import { deterministicPriorityProvider } from "@/lib/priority/providers/stub";
import { estimateYearsExperience } from "@/lib/scoring/shared";
import { skillsMatch } from "@/lib/text-utils";
import type { CareerGoal, Job, Skill } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * Tests for the two engines every score in Workly comes from.
 *
 * The properties asserted here are product guarantees, not implementation
 * details — most importantly that Priority is NOT Fit, which was an
 * explicit requirement and is the kind of thing that silently regresses
 * when someone "simplifies" the weighting later.
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

function profileWith(skills: string[], yearsExperience = 5): FullCareerProfile {
  return {
    profile: {
      id: "profile-1",
      userId: "user-1",
      headline: "Product Analyst",
      summary: "Analyst working in software.",
      location: "London",
      currentRole: "Product Analyst",
      currentCompany: "Acme",
      yearsExperience,
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
    },
    educations: [
      {
        id: "edu-1",
        careerProfileId: "profile-1",
        institution: "University",
        degree: "BSc",
        fieldOfStudy: "Statistics",
        startDate: null,
        endDate: null,
        description: null,
        source: "USER",
        isUncertain: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
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
    requirements: [
      { text: "Strong SQL", mandatory: true, category: "skill" },
      { text: "Python", mandatory: true, category: "skill" },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("fit scoring", () => {
  it("is deterministic — the same inputs always produce the same score", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith();
    const a = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    const b = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    expect(a.fitScore).toBe(b.fitScore);
    expect(a.recommendation).toBe(b.recommendation);
  });

  it("always returns a score within 0-100", () => {
    const cases: FullCareerProfile[] = [
      profileWith([]),
      profileWith(["SQL"]),
      profileWith(["SQL", "Python", "R", "Tableau"], 20),
    ];
    for (const profile of cases) {
      const { fitScore } = deterministicScoringProvider.analyzeFit({
        profile,
        careerGoal: null,
        job: jobWith(),
      });
      expect(fitScore).toBeGreaterThanOrEqual(0);
      expect(fitScore).toBeLessThanOrEqual(100);
    }
  });

  it("scores a matching profile above a non-matching one", () => {
    const job = jobWith();
    const matching = deterministicScoringProvider.analyzeFit({
      profile: profileWith(["SQL", "Python"]),
      careerGoal: null,
      job,
    });
    const notMatching = deterministicScoringProvider.analyzeFit({
      profile: profileWith(["Welding", "Carpentry"]),
      careerGoal: null,
      job,
    });
    expect(matching.fitScore).toBeGreaterThan(notMatching.fitScore);
  });

  it("never claims a hiring probability anywhere in its output", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: profileWith(["SQL", "Python"]),
      careerGoal: null,
      job: jobWith(),
    });
    const allText = [
      result.recommendationReasoning,
      ...result.strengths,
      ...result.weaknesses,
      ...result.risks,
      ...result.improvements,
      ...Object.values(result.scoreBreakdown).map((c) => c.reasoning),
    ].join(" ");
    // The product rule: Workly reports Candidate Fit, never odds of being hired.
    expect(allText).not.toMatch(/chance of (getting|being) hired|probability of being hired|% chance/i);
  });

  it("credits evidence-backed skills above merely stated ones", () => {
    const job = jobWith();
    const base = profileWith(["SQL", "Python"]);
    const stated: FullCareerProfile = {
      ...base,
      skills: base.skills.map((s) => ({ ...s, evidenceLevel: "STATED" as const })),
    };
    const demonstrated = deterministicScoringProvider.analyzeFit({ profile: base, careerGoal: null, job });
    const selfStated = deterministicScoringProvider.analyzeFit({ profile: stated, careerGoal: null, job });
    expect(demonstrated.fitScore).toBeGreaterThanOrEqual(selfStated.fitScore);
  });
});

describe("priority scoring", () => {
  const goal: CareerGoal = {
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
  };

  it("does NOT simply equal the fit score", () => {
    // The core Phase 4 requirement: a job you'd get isn't automatically a
    // job worth your time. A career-regressing role should score high on
    // fit and lower on priority.
    const profile = profileWith(["SQL", "Python"], 10);
    const regressiveJob = jobWith({ seniority: "JUNIOR", title: "Junior Data Entry", salaryMin: 20000, salaryMax: 24000 });
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job: regressiveJob });
    const analysis = {
      id: "a1",
      userId: "user-1",
      jobId: "job-1",
      ...fit,
      createdAt: now,
      updatedAt: now,
    };
    const { priorityScore } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job: regressiveJob,
      analysis,
    });
    expect(priorityScore).not.toBe(fit.fitScore);
    expect(priorityScore).toBeLessThan(fit.fitScore);
  });

  it("keeps priority within 0-100 and sums its components", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith();
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const analysis = { id: "a1", userId: "u", jobId: "j", ...fit, createdAt: now, updatedAt: now };
    const { priorityScore, priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis,
    });
    expect(priorityScore).toBeGreaterThanOrEqual(0);
    expect(priorityScore).toBeLessThanOrEqual(100);

    const summed = Object.values(priorityBreakdown).reduce((total, c) => total + c.score, 0);
    expect(Math.abs(summed - priorityScore)).toBeLessThanOrEqual(1);
  });

  it("caps the direct fit contribution so fit cannot dominate priority", () => {
    const profile = profileWith(["SQL", "Python"]);
    const job = jobWith();
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: goal, job });
    const analysis = { id: "a1", userId: "u", jobId: "j", ...fit, createdAt: now, updatedAt: now };
    const { priorityBreakdown } = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: goal,
      job,
      analysis,
    });
    expect(priorityBreakdown.candidateFit.maxScore).toBeLessThanOrEqual(25);
  });
});

describe("skill matching accuracy & aliases", () => {
  it("never matches distinct languages like Java and JavaScript", () => {
    expect(skillsMatch("Java", "JavaScript")).toBe(false);
    expect(skillsMatch("JavaScript", "Java")).toBe(false);
    expect(skillsMatch("Java", "TypeScript")).toBe(false);
  });

  it("accurately matches tech aliases and canonical forms", () => {
    expect(skillsMatch("AWS", "Amazon Web Services")).toBe(true);
    expect(skillsMatch("K8s", "Kubernetes")).toBe(true);
    expect(skillsMatch("Go", "Golang")).toBe(true);
    expect(skillsMatch("React", "React.js")).toBe(true);
    expect(skillsMatch("Node", "Node.js")).toBe(true);
    expect(skillsMatch("Postgres", "PostgreSQL")).toBe(true);
    expect(skillsMatch("TS", "TypeScript")).toBe(true);
    expect(skillsMatch("CI/CD", "Continuous Integration")).toBe(true);
  });

  it("scores a profile with JavaScript lower on a Java requirement", () => {
    const javaJob = jobWith({
      requiredSkills: ["Java"],
      requirements: [{ text: "Java", mandatory: true, category: "skill" }],
    });

    const javaProfile = profileWith(["Java"]);
    const jsProfile = profileWith(["JavaScript"]);

    const javaFit = deterministicScoringProvider.analyzeFit({ profile: javaProfile, careerGoal: null, job: javaJob });
    const jsFit = deterministicScoringProvider.analyzeFit({ profile: jsProfile, careerGoal: null, job: javaJob });

    expect(javaFit.fitScore).toBeGreaterThan(jsFit.fitScore);
  });
});


describe("algorithm audit edge cases", () => {
  it("directional skill matching: React matches React Native req, but React Native doesn't match React req", () => {
    // candidate is argument 1, requirement is argument 2
    
    // Candidate has React Native, Job requires React -> MATCH
    expect(skillsMatch("React Native", "React")).toBe(true);
    
    // Candidate has React, Job requires React Native -> NO MATCH (Candidate has generic, Job wants specific)
    expect(skillsMatch("React", "React Native")).toBe(false);
  });

  it("handles single-character tech skills like C and R correctly", () => {
    expect(skillsMatch("C", "C")).toBe(true);
    expect(skillsMatch("R", "R")).toBe(true);
    
    // Exact match only set ensures "C" doesn't match inside another word if word boundaries fail
    // Word boundary logic: \bC\b inside "Objective-C" would match by regex, but C is EXACT_MATCH_ONLY
    // Objective-C is a different language, so this should correctly be false.
    expect(skillsMatch("Objective-C", "C")).toBe(false);
  });

  it("experience year calculation does not double count overlapping roles", () => {
    const profile = profileWith([], null as any); // pass null so it calculates from experiences
    profile.experiences = [
      {
        id: "1",
        startDate: new Date("2020-01-01").toISOString(),
        endDate: new Date("2021-01-01").toISOString(),
        isCurrent: false,
      } as any,
      {
        id: "2",
        startDate: new Date("2020-01-01").toISOString(),
        endDate: new Date("2021-01-01").toISOString(),
        isCurrent: false,
      } as any,
    ];
    
    // Should be exactly 1 year, not 2 years
    expect(estimateYearsExperience(profile)).toBe(1);
  });
});

