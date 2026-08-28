import { describe, it, expect } from "vitest";

import { deterministicScoringProvider } from "@/lib/scoring/providers/stub";
import type { Job, Skill } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * Regression coverage for a real production failure the user reported and
 * screenshotted: a data-analytics/Python/SQL candidate was shown Fit scores
 * of 66-74/100 for postings with nothing to do with their background - an
 * Occupational Therapist role ("You match 1 of 1 listed skills: leadership"),
 * a Retail Merchandiser role ("You match 1 of 1 listed skills: excel"), and
 * a Freelance Interpreter role the user's own review called "very
 * inaccurate" (0-10 estimated fit against a shown 74/100).
 *
 * Root cause: scoreSkills() in stub.ts always credited the FULL 30-point
 * skills weight for whatever ratio was computed, no matter how few skills
 * a posting actually named. A scraped listing that only yielded one
 * extracted required skill - often a generic word like "leadership" or
 * "excel" that appears on nearly every profile - let a single coincidental
 * match max out the single heaviest component in the engine. Combined with
 * totalFrom()'s "score over what we could measure" normalization, that one
 * match could dominate the whole blended score for a job where almost
 * nothing else (industry, seniority, education, years of experience) was
 * actually assessable, producing a confident-looking 70-something score for
 * a job with real relevance close to zero.
 *
 * The fix: scoreSkills() now shrinks the component's own weight (not the
 * ratio) in proportion to how many skills were actually named, below a
 * SKILL_SAMPLE_FULL_CONFIDENCE of 3. A thin sample can no longer carry the
 * same weight as a real comparison, which correctly drags total coverage
 * down for these thin, mostly-unmeasurable postings - most of the time
 * below MIN_COVERAGE_FOR_SCORE, so Workly now declines to score them at all
 * rather than presenting a fabricated-looking number.
 */

const now = new Date();

function skill(name: string, evidenceLevel: Skill["evidenceLevel"] = "STATED"): Skill {
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

/** A data-analytics candidate profile - the one from the user's screenshots. */
function dataAnalystProfile(yearsExperience = 4): FullCareerProfile {
  return {
    profile: {
      id: "profile-1",
      userId: "user-1",
      headline: "Data Analyst",
      summary: "Data analytics, market research, Python and SQL.",
      location: null,
      currentRole: "Data Analyst",
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
    educations: [],
    experiences: [],
    projects: [],
    // "Leadership" is exactly the kind of generic transferable-sounding
    // skill a data analyst's profile plausibly lists alongside the real,
    // relevant ones - it should not be able to carry a whole score alone.
    skills: [skill("Python"), skill("SQL"), skill("Data Analytics"), skill("Leadership")],
    achievements: [],
    certifications: [],
    documents: [],
    workValues: [],
  };
}

/**
 * A thinly-described, domain-irrelevant posting: only one extracted
 * required skill, and every other component genuinely unassessable -
 * exactly the shape of a real scraped Adzuna listing for a role like
 * "Occupational Therapist MVA & WSIB Program Lead".
 */
function thinIrrelevantJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    userId: "user-1",
    inputMethod: "PASTED_TEXT",
    url: null,
    rawInput: "",
    status: "PARSED",
    errorMessage: null,
    title: "Occupational Therapist MVA & WSIB Program Lead",
    company: "Foundation Health Canada",
    location: "Toronto, Ontario",
    country: "Canada",
    salaryMin: 114400,
    salaryMax: 135200,
    salaryCurrency: "USD",
    employmentType: "FULL_TIME",
    workMode: "REMOTE",
    seniority: null,
    description: "Lead our MVA & WSIB occupational therapy program.",
    requiredExperienceYears: null,
    preferredExperienceYears: null,
    education: null,
    industry: null,
    deadline: null,
    datePosted: null,
    source: null,
    requiredSkills: ["leadership"],
    preferredSkills: [],
    requirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("fit scoring — thin skill samples cannot dominate the score", () => {
  it("does not hand out the full skills weight for a single generic required-skill match", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: dataAnalystProfile(),
      careerGoal: null,
      job: thinIrrelevantJob(),
    });

    // A 1-skill match must never carry the full 30-point weight - that's
    // the exact mechanism that inflated the real production scores.
    expect(result.scoreBreakdown.skills.maxScore).toBeLessThan(30);
  });

  it("reproduces the real bug report: a data-analytics profile against an unrelated, thinly-described role no longer scores in the 60s-70s", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: dataAnalystProfile(),
      careerGoal: null,
      job: thinIrrelevantJob(),
    });

    // Before the fix this scenario reproduced the screenshotted ~66-75/100
    // "Fit" score. With almost nothing else about the job assessable, this
    // must now either withhold a score entirely (coverage too low) or, if
    // some coverage remains, land far below a number that reads as "good
    // fit" for a role with essentially no real overlap with the profile.
    if (result.fitScore != null && result.coverage >= 0.4) {
      expect(result.fitScore).toBeLessThan(50);
    } else {
      expect(result.competitiveness).toBe("Insufficient data");
    }
  });

  it("still gives full skills weight to a real, multi-skill comparison — no regression for well-described postings", () => {
    const wellDescribedJob = thinIrrelevantJob({
      title: "Data Analyst",
      requiredSkills: ["Python", "SQL", "Data Analytics"],
      requiredExperienceYears: 3,
      industry: "Technology",
      seniority: "MID",
      education: null,
    });
    const result = deterministicScoringProvider.analyzeFit({
      profile: dataAnalystProfile(),
      careerGoal: null,
      job: wellDescribedJob,
    });

    expect(result.scoreBreakdown.skills.maxScore).toBe(30);
    // A genuine strong match on a well-described, relevant posting should
    // still score confidently high - this fix must not punish real matches.
    expect(result.fitScore).not.toBeNull();
    expect(result.fitScore as number).toBeGreaterThanOrEqual(70);
  });

  it("a 2-skill match is shrunk less than a 1-skill match, but still less than a 3+ skill match", () => {
    const oneSkill = deterministicScoringProvider.analyzeFit({
      profile: dataAnalystProfile(),
      careerGoal: null,
      job: thinIrrelevantJob({ requiredSkills: ["leadership"] }),
    });
    const twoSkills = deterministicScoringProvider.analyzeFit({
      profile: dataAnalystProfile(),
      careerGoal: null,
      job: thinIrrelevantJob({ requiredSkills: ["leadership", "data analytics"] }),
    });
    const threeSkills = deterministicScoringProvider.analyzeFit({
      profile: dataAnalystProfile(),
      careerGoal: null,
      job: thinIrrelevantJob({ requiredSkills: ["leadership", "data analytics", "python"] }),
    });

    expect(oneSkill.scoreBreakdown.skills.maxScore).toBeLessThan(twoSkills.scoreBreakdown.skills.maxScore);
    expect(twoSkills.scoreBreakdown.skills.maxScore).toBeLessThan(threeSkills.scoreBreakdown.skills.maxScore);
    expect(threeSkills.scoreBreakdown.skills.maxScore).toBe(30);
  });
});
