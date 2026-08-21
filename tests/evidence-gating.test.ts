import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { deterministicScoringProvider } from "@/lib/scoring/providers/stub";
import { deterministicPriorityProvider } from "@/lib/priority/providers/stub";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/shared";
import type { CareerGoal, Job, Skill, SeniorityLevel } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * THE HONESTY CONTRACT.
 *
 * These tests exist because the engine used to be structurally incapable of
 * saying "I don't know", and every one of them pins down a specific false
 * statement it used to make.
 *
 * The single most important assertion in this file is that a score is never
 * a stand-in for missing data. A user reading "0/25 on experience" believes
 * Workly measured their experience and found none. If in fact their CV
 * dates failed to parse, that number is a lie about them, told confidently.
 */

const now = new Date();

function skill(name: string, evidenceLevel: Skill["evidenceLevel"] = "DEMONSTRATED"): Skill {
  return {
    id: `skill-${name}`,
    careerProfileId: "p1",
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

function emptyProfile(): FullCareerProfile {
  return {
    profile: {
      id: "p1",
      userId: "u1",
      headline: null,
      summary: null,
      location: null,
      currentRole: null,
      currentCompany: null,
      yearsExperience: null,
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
    skills: [],
    achievements: [],
    certifications: [],
    documents: [],
  };
}

function fullProfile(skills: string[], years = 8): FullCareerProfile {
  const base = emptyProfile();
  return {
    ...base,
    profile: {
      ...base.profile!,
      headline: "Senior Product Analyst",
      summary: "Analyst working in software.",
      location: "London",
      yearsExperience: years,
    },
    educations: [
      {
        id: "e1",
        careerProfileId: "p1",
        institution: "University",
        degree: "BSc Statistics",
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
    skills: skills.map((s) => skill(s)),
  };
}

function jobWith(overrides: Partial<Job> = {}): Job {
  return {
    id: "j1",
    userId: "u1",
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
    requirements: [{ text: "Strong SQL", mandatory: true, category: "skill" }],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** An empty job: parsed, but nothing useful extracted from it. */
function emptyJob(): Job {
  return jobWith({
    title: null,
    company: null,
    location: null,
    country: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    seniority: null,
    employmentType: null,
    workMode: null,
    description: null,
    requiredExperienceYears: null,
    preferredExperienceYears: null,
    education: null,
    industry: null,
    requiredSkills: [],
    preferredSkills: [],
    requirements: [],
  });
}

const allText = (r: ReturnType<typeof deterministicScoringProvider.analyzeFit>) =>
  [
    r.recommendationReasoning,
    ...r.strengths,
    ...r.weaknesses,
    ...r.risks,
    ...r.improvements,
    ...Object.values(r.scoreBreakdown).map((c) => c.reasoning),
  ].join(" ");

// ---------------------------------------------------------------------------

describe("missing data never becomes a score", () => {
  it("does not claim a years-of-experience figure it never measured", () => {
    // The exact regression: an engineer whose CV produced no dates was told
    // "You have 0 years of experience, short of the 5-year requirement".
    const result = deterministicScoringProvider.analyzeFit({
      profile: emptyProfile(),
      careerGoal: null,
      job: jobWith({ requiredExperienceYears: 5 }),
    });

    expect(result.scoreBreakdown.experience.confidence).toBe("unavailable");
    expect(allText(result)).not.toMatch(/\b0 years? of experience\b/i);
    expect(allText(result)).not.toMatch(/you have about 0\b/i);
  });

  it("does not claim the candidate matched zero skills when there are no skills on file", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: emptyProfile(),
      careerGoal: null,
      job: jobWith({ requiredSkills: ["SQL", "Python", "dbt"] }),
    });

    expect(result.scoreBreakdown.skills.confidence).toBe("unavailable");
    expect(allText(result)).not.toMatch(/you match 0 of/i);
  });

  it("withholds the competitiveness verdict entirely when too little is assessable", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: emptyProfile(),
      careerGoal: null,
      job: jobWith(),
    });

    expect(result.coverage).toBeLessThan(MIN_COVERAGE_FOR_SCORE);
    expect(result.competitiveness).toBe("Insufficient data");
    // The old engine scored this 19/100, called it "Low", and said SKIP.
    expect(result.recommendation).not.toBe("SKIP");
  });

  it("does not tell someone with no profile that their profile is well aligned", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: emptyProfile(),
      careerGoal: null,
      job: emptyJob(),
    });
    expect(allText(result)).not.toMatch(/well.aligned|some overlap with this role/i);
  });

  it("an unmeasurable component costs the user nothing", () => {
    // Same profile, two jobs: one where industry can be assessed, one where
    // it cannot. The unassessable one must not score lower for it.
    const profile = fullProfile(["SQL", "Python"]);
    const withIndustry = deterministicScoringProvider.analyzeFit({
      profile,
      careerGoal: null,
      job: jobWith({ industry: "Software" }),
    });
    const withoutIndustry = deterministicScoringProvider.analyzeFit({
      profile,
      careerGoal: null,
      job: jobWith({ industry: null }),
    });

    expect(withoutIndustry.scoreBreakdown.industryRelevance.confidence).toBe("unavailable");
    // Removing a component the user was scoring well on should not punish
    // them. Under the old fixed denominator it silently would have.
    expect(withoutIndustry.fitScore).toBeGreaterThanOrEqual(withIndustry.fitScore - 1);
  });
});

describe("absence of evidence is never evidence either way", () => {
  it("does not claim a location matches when the posting never stated one", () => {
    const profile = fullProfile(["SQL"]);
    const result = deterministicScoringProvider.analyzeFit({
      profile,
      careerGoal: null,
      job: jobWith({ location: null, country: null, workMode: "ONSITE" }),
    });
    expect(result.scoreBreakdown.location.confidence).toBe("unavailable");
    expect(allText(result)).not.toMatch(/location .*(matches|lines up)/i);
  });

  it("does not award full education marks just because an education row exists", () => {
    // "PhD in Molecular Biology" vs a BSc must not read as satisfied.
    const profile = fullProfile(["SQL"]);
    const result = deterministicScoringProvider.analyzeFit({
      profile,
      careerGoal: null,
      job: jobWith({ education: "PhD in Molecular Biology" }),
    });
    const edu = result.scoreBreakdown.education;
    expect(edu.score).toBeLessThan(edu.maxScore);
  });

  it("records an unverifiable requirement as unknown, not as failed", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: fullProfile(["SQL"]),
      careerGoal: null,
      job: jobWith({
        requirements: [
          { text: "Comfortable operating in ambiguity across a matrixed org", mandatory: true, category: "other" },
        ],
      }),
    });

    const req = result.mandatoryRequirements[0];
    expect(req.status).toBe("unknown");
    // And it must not be reported to the user as a requirement they fail.
    expect(allText(result)).not.toMatch(/1 mandatory requirement you do not appear to meet/i);
  });

  it("says out loud when it could not check requirements automatically", () => {
    const result = deterministicScoringProvider.analyzeFit({
      profile: fullProfile(["SQL"]),
      careerGoal: null,
      job: jobWith({
        requirements: [
          { text: "Thrives amid ambiguity in a matrixed environment", mandatory: true, category: "other" },
        ],
      }),
    });
    expect(result.risks.some((r) => /could not check/i.test(r))).toBe(true);
  });
});

describe("corrupt data cannot become a confident number", () => {
  it("an unparseable end date does not produce NaN or invent a seniority", () => {
    const profile = emptyProfile();
    profile.experiences = [
      {
        id: "x1",
        careerProfileId: "p1",
        company: "Acme",
        title: "Analyst",
        location: null,
        startDate: new Date("2019-01-01"),
        // The real-world case: a raw SQL row yields an invalid Date.
        endDate: new Date("not-a-date"),
        isCurrent: false,
        description: null,
        source: "USER",
        isUncertain: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const result = deterministicScoringProvider.analyzeFit({
      profile,
      careerGoal: null,
      job: jobWith(),
    });

    expect(Number.isFinite(result.fitScore)).toBe(true);
    expect(allText(result)).not.toMatch(/NaN/);
    // It must not fall through to claiming the user is at PRINCIPAL level.
    expect(allText(result)).not.toMatch(/principal level/i);
  });

  it("a non-finite stored fit score does not silently become priority points", () => {
    const profile = fullProfile(["SQL"]);
    const job = jobWith();
    const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
    const analysis = {
      id: "a1",
      userId: "u1",
      jobId: "j1",
      ...fit,
      fitScore: Number.NaN,
      createdAt: now,
      updatedAt: now,
    };

    const result = deterministicPriorityProvider.computePriority({
      profile,
      careerGoal: null,
      job,
      analysis,
    });

    expect(Number.isFinite(result.priorityScore)).toBe(true);
    expect(result.priorityBreakdown.candidateFit.confidence).toBe("unavailable");
  });
});

// ---------------------------------------------------------------------------
// Property-based invariants.
//
// Hand-written cases only prove the engine behaves on inputs someone thought
// of. These generate thousands of profile/job combinations and assert the
// properties that must hold for every one of them.
// ---------------------------------------------------------------------------

const SENIORITIES: SeniorityLevel[] = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE"];
const SKILL_POOL = ["SQL", "Python", "React", "dbt", "Tableau", "Go", "Kubernetes", "Figma"];

const arbProfile = fc
  .record({
    skills: fc.uniqueArray(fc.constantFrom(...SKILL_POOL), { maxLength: 6 }),
    years: fc.option(fc.integer({ min: 0, max: 40 }), { nil: null }),
    hasEducation: fc.boolean(),
  })
  .map(({ skills, years, hasEducation }) => {
    const p = emptyProfile();
    p.profile!.yearsExperience = years;
    p.skills = skills.map((s) => skill(s));
    if (hasEducation) {
      p.educations = [
        {
          id: "e1",
          careerProfileId: "p1",
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
      ];
    }
    return p;
  });

const arbJob = fc
  .record({
    requiredSkills: fc.uniqueArray(fc.constantFrom(...SKILL_POOL), { maxLength: 5 }),
    preferredSkills: fc.uniqueArray(fc.constantFrom(...SKILL_POOL), { maxLength: 3 }),
    requiredExperienceYears: fc.option(fc.integer({ min: 0, max: 20 }), { nil: null }),
    seniority: fc.option(fc.constantFrom(...SENIORITIES), { nil: null }),
    industry: fc.option(fc.constantFrom("Software", "Finance", "Health"), { nil: null }),
    location: fc.option(fc.constantFrom("London", "Berlin", "Austin"), { nil: null }),
  })
  .map((o) => jobWith(o));

describe("invariants that must hold for every input", () => {
  it("the score is always a finite number within 0 and 100", () => {
    fc.assert(
      fc.property(arbProfile, arbJob, (profile, job) => {
        const r = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        expect(Number.isFinite(r.fitScore)).toBe(true);
        expect(r.fitScore).toBeGreaterThanOrEqual(0);
        expect(r.fitScore).toBeLessThanOrEqual(100);
      }),
      { numRuns: 500 },
    );
  });

  it("coverage is always a fraction, and matches whether a verdict was given", () => {
    fc.assert(
      fc.property(arbProfile, arbJob, (profile, job) => {
        const r = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        expect(r.coverage).toBeGreaterThanOrEqual(0);
        expect(r.coverage).toBeLessThanOrEqual(1);
        // The contract: a real verdict is given if and only if enough was
        // measurable. These two must never disagree.
        const gaveVerdict = r.competitiveness !== "Insufficient data";
        expect(gaveVerdict).toBe(r.coverage >= MIN_COVERAGE_FOR_SCORE);
      }),
      { numRuns: 500 },
    );
  });

  it("is deterministic: identical inputs always give an identical result", () => {
    fc.assert(
      fc.property(arbProfile, arbJob, (profile, job) => {
        const a = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        const b = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }),
      { numRuns: 300 },
    );
  });

  it("gaining a skill the job asks for never lowers the score", () => {
    // Monotonicity. If adding a genuinely matching qualification could
    // reduce someone's score, the engine is not measuring what it claims.
    fc.assert(
      fc.property(arbProfile, arbJob, fc.constantFrom(...SKILL_POOL), (profile, job, extra) => {
        fc.pre(job.requiredSkills.includes(extra));
        fc.pre(!profile.skills.some((s) => s.name === extra));

        const before = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        const after = deterministicScoringProvider.analyzeFit({
          profile: { ...profile, skills: [...profile.skills, skill(extra)] },
          careerGoal: null,
          job,
        });

        // Compare like with like: only when both had skills assessable.
        fc.pre(before.scoreBreakdown.skills.confidence !== "unavailable");
        expect(after.scoreBreakdown.skills.score).toBeGreaterThanOrEqual(
          before.scoreBreakdown.skills.score - 1e-9,
        );
      }),
      { numRuns: 400 },
    );
  });

  it("never states a hiring probability, whatever the inputs", () => {
    fc.assert(
      fc.property(arbProfile, arbJob, (profile, job) => {
        const r = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        expect(allText(r)).not.toMatch(
          /chance of (getting|being) hired|probability of being hired|% chance|likely to get (the|this) job|odds of/i,
        );
      }),
      { numRuns: 300 },
    );
  });

  it("every component reports a score inside its own maximum", () => {
    fc.assert(
      fc.property(arbProfile, arbJob, (profile, job) => {
        const r = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        for (const c of Object.values(r.scoreBreakdown)) {
          expect(Number.isFinite(c.score)).toBe(true);
          expect(c.score).toBeGreaterThanOrEqual(0);
          expect(c.score).toBeLessThanOrEqual(c.maxScore);
          // An unavailable component must never carry points.
          if (c.confidence === "unavailable") expect(c.score).toBe(0);
        }
      }),
      { numRuns: 400 },
    );
  });

  it("priority stays bounded and finite for every generated analysis", () => {
    fc.assert(
      fc.property(arbProfile, arbJob, (profile, job) => {
        const fit = deterministicScoringProvider.analyzeFit({ profile, careerGoal: null, job });
        const analysis = { id: "a", userId: "u", jobId: "j", ...fit, createdAt: now, updatedAt: now };
        const r = deterministicPriorityProvider.computePriority({
          profile,
          careerGoal: null,
          job,
          analysis,
        });
        expect(Number.isFinite(r.priorityScore)).toBe(true);
        expect(r.priorityScore).toBeGreaterThanOrEqual(0);
        expect(r.priorityScore).toBeLessThanOrEqual(100);
      }),
      { numRuns: 300 },
    );
  });
});
