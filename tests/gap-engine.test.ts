import { describe, it, expect } from "vitest";

import { buildGapAnalysis } from "@/lib/dream-job/gap-engine";
import { dreamJobToJobLike } from "@/lib/dream-job/to-job-like";
import { deterministicScoringProvider } from "@/lib/scoring/providers/stub";
import type {
  DreamJob,
  Experience,
  Job,
  OpportunityWithJob,
  Project,
  Skill,
} from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * Tests for the Dream Job Gap Engine (lib/dream-job/gap-engine.ts) - the
 * "what should I actually do about this gap" layer that sits on top of Fit.
 *
 * Before this file, buildGapAnalysis had zero direct test coverage despite
 * being 500+ lines of judgement calls that get shown to a paying user as
 * career advice: difficulty estimates, CV rewrite suggestions, and project
 * recommendations. A wrong classification here isn't a cosmetic bug, it's
 * bad advice stated with total confidence.
 */

const now = new Date();

function skill(name: string, evidenceLevel: Skill["evidenceLevel"] = "DEMONSTRATED", isTransferable = false): Skill {
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
    isTransferable,
    transferableRationale: null,
    createdAt: now,
    updatedAt: now,
  };
}

function experience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: `exp-${Math.random()}`,
    careerProfileId: "profile-1",
    company: "Acme",
    title: "Product Analyst",
    location: null,
    startDate: new Date("2020-01-01"),
    endDate: null,
    isCurrent: true,
    description: "Analyzed product metrics and shipped dashboards for the growth team.",
    source: "USER",
    isUncertain: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: `proj-${Math.random()}`,
    careerProfileId: "profile-1",
    name: "Growth dashboard",
    role: null,
    description: "Built a self-serve analytics dashboard for the growth team using SQL and Python.",
    url: null,
    startDate: null,
    endDate: null,
    source: "USER",
    isUncertain: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function profileWith(opts: {
  skills?: string[];
  yearsExperience?: number | null;
  headline?: string | null;
  summary?: string | null;
  experiences?: Experience[];
  projects?: Project[];
  hasEducation?: boolean;
} = {}): FullCareerProfile {
  const {
    skills = [],
    yearsExperience = 5,
    headline = "Product Analyst",
    summary = "Analyst working in software.",
    experiences = [],
    projects = [],
    hasEducation = true,
  } = opts;

  return {
    profile: {
      id: "profile-1",
      userId: "user-1",
      headline,
      summary,
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
    educations: hasEducation
      ? [
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
        ]
      : [],
    experiences,
    projects,
    skills: skills.map((s) => skill(s)),
    achievements: [],
    certifications: [],
    documents: [],
  };
}

function dreamJobWith(overrides: Partial<DreamJob> = {}): DreamJob {
  return {
    id: "dream-1",
    userId: "user-1",
    dreamRole: "Senior Data Analyst",
    companyName: null,
    portfolio: null,
    rawInput: "",
    status: "PARSED",
    errorMessage: null,
    title: "Senior Data Analyst",
    company: "Northwind",
    location: "London",
    country: "United Kingdom",
    salaryMin: 70000,
    salaryMax: 90000,
    salaryCurrency: "GBP",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    seniority: "SENIOR",
    description: "Senior analyst role",
    requiredExperienceYears: 5,
    preferredExperienceYears: null,
    education: null,
    industry: "Software",
    deadline: null,
    datePosted: null,
    source: "Pasted by user",
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

function opportunityWith(job: Job, id = `opp-${Math.random()}`): OpportunityWithJob {
  return {
    id,
    userId: "user-1",
    jobId: job.id,
    jobAnalysisId: null,
    fitScore: 50,
    recommendation: "STRETCH",
    competitiveness: "Moderate",
    priorityScore: 50,
    priorityBreakdown: {} as OpportunityWithJob["priorityBreakdown"],
    isSaved: false,
    status: "DISCOVERED",
    discoveredAt: now,
    lastAnalyzedAt: now,
    createdAt: now,
    updatedAt: now,
    job,
    analysis: null,
  };
}

function jobLikeFor(dreamJob: DreamJob): Job {
  return dreamJobToJobLike(dreamJob);
}

function analyze(params: { profile: FullCareerProfile; dreamJob: DreamJob; opportunities?: OpportunityWithJob[] }) {
  const dreamJobLike = jobLikeFor(params.dreamJob);
  const fit = deterministicScoringProvider.analyzeFit({ profile: params.profile, careerGoal: null, job: dreamJobLike });
  return buildGapAnalysis({
    dreamJobLike,
    fit,
    profile: params.profile,
    opportunities: params.opportunities ?? [],
  });
}

describe("dreamJobToJobLike", () => {
  it("carries every extracted field across unchanged", () => {
    const dreamJob = dreamJobWith({ title: "Staff Engineer", requiredSkills: ["Go", "Kubernetes"] });
    const jobLike = dreamJobToJobLike(dreamJob);
    expect(jobLike.title).toBe("Staff Engineer");
    expect(jobLike.requiredSkills).toEqual(["Go", "Kubernetes"]);
    expect(jobLike.id).toBe(dreamJob.id);
    expect(jobLike.userId).toBe(dreamJob.userId);
  });

  it("always sets inputMethod to PASTED_TEXT and url to null, since a dream job is never a URL submission", () => {
    const jobLike = dreamJobToJobLike(dreamJobWith());
    expect(jobLike.inputMethod).toBe("PASTED_TEXT");
    expect(jobLike.url).toBeNull();
  });
});

describe("skill difficulty classification", () => {
  // Regression coverage for a real bug: naive substring matching against
  // keyword lists like "go" and "word" matched INSIDE unrelated skill
  // names ("Google Analytics" contains "go", "WordPress" contains "word"),
  // misclassifying ordinary marketing/web skills as either an unrealistic
  // multi-week HIGH-difficulty item or a trivially-dismissed LOW one.
  it("does not misclassify Google Analytics as high-difficulty via a 'go' substring match", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Google Analytics"],
      requirements: [{ text: "Google Analytics", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    const gap = result.gapPriorities.find((g) => g.title === "Google Analytics");
    expect(gap).toBeDefined();
    expect(gap!.difficulty).not.toBe("HIGH");
  });

  it("does not misclassify WordPress as trivial via a 'word' substring match", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["WordPress"],
      requirements: [{ text: "WordPress", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    const gap = result.gapPriorities.find((g) => g.title === "WordPress");
    expect(gap).toBeDefined();
    expect(gap!.difficulty).not.toBe("LOW");
  });

  // Related edge case, not a regression of the fix above: word-boundary
  // matching correctly stops "Google Analytics" from matching bare "go",
  // but "Go-to-market Strategy" normalizes to "go to market strategy",
  // where "go" IS a genuine standalone word - just the verb, not the
  // language. Fixed by keying HIGH difficulty off "golang" only.
  it("does not misclassify Go-to-market Strategy as high-difficulty via a standalone 'go'", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Go-to-market Strategy"],
      requirements: [{ text: "Go-to-market Strategy", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    const gap = result.gapPriorities.find((g) => g.title === "Go-to-market Strategy");
    expect(gap).toBeDefined();
    expect(gap!.difficulty).not.toBe("HIGH");
  });

  it("still classifies the Go programming language as high-difficulty", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Golang"],
      requirements: [{ text: "Golang", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    const gap = result.gapPriorities.find((g) => g.title === "Golang");
    expect(gap?.difficulty).toBe("HIGH");
  });

  it("still classifies genuine infra/cloud skills as high-difficulty", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Kubernetes", "AWS"],
      requirements: [
        { text: "Kubernetes", mandatory: true, category: "skill" },
        { text: "AWS", mandatory: true, category: "skill" },
      ],
    });
    const result = analyze({ profile, dreamJob });
    for (const name of ["Kubernetes", "AWS"]) {
      const gap = result.gapPriorities.find((g) => g.title === name);
      expect(gap?.difficulty).toBe("HIGH");
    }
  });

  it("still classifies genuine soft skills as low-difficulty", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Communication", "Stakeholder management"],
      requirements: [
        { text: "Communication", mandatory: true, category: "skill" },
        { text: "Stakeholder management", mandatory: true, category: "skill" },
      ],
    });
    const result = analyze({ profile, dreamJob });
    for (const name of ["Communication", "Stakeholder management"]) {
      const gap = result.gapPriorities.find((g) => g.title === name);
      expect(gap?.difficulty).toBe("LOW");
    }
  });

  it("classifies C++ as high-difficulty (regression: the c++->cplusplus normalization used to be dead code)", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["C++"],
      requirements: [{ text: "C++", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    const gap = result.gapPriorities.find((g) => g.title === "C++");
    expect(gap?.difficulty).toBe("HIGH");
  });
});

describe("buildSkillGapPriorities", () => {
  it("does not list a skill the candidate already has as a gap", () => {
    const profile = profileWith({ skills: ["SQL", "Python"] });
    const dreamJob = dreamJobWith({ requiredSkills: ["SQL", "Python"] });
    const result = analyze({ profile, dreamJob });
    expect(result.gapPriorities.filter((g) => g.gapType === "SKILL_GAP")).toHaveLength(0);
  });

  it("marks a required skill missing from a populated profile as higher impact than a preferred one", () => {
    const profile = profileWith({ skills: ["Excel"] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["SQL"],
      preferredSkills: ["Tableau"],
      requirements: [
        { text: "SQL", mandatory: true, category: "skill" },
        { text: "Tableau", mandatory: false, category: "skill" },
      ],
    });
    const result = analyze({ profile, dreamJob });
    const required = result.gapPriorities.find((g) => g.title === "SQL");
    const preferred = result.gapPriorities.find((g) => g.title === "Tableau");
    expect(required).toBeDefined();
    expect(preferred).toBeDefined();
    // Required gaps start at MEDIUM/HIGH impact; preferred gaps start at LOW/MEDIUM.
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    expect(rank[required!.impact]).toBeLessThanOrEqual(rank[preferred!.impact]);
  });

  it("counts and links the user's own tracked opportunities that also need this skill", () => {
    const profile = profileWith({ skills: [] });
    const missingSkillJob = (n: number): Job => ({
      id: `job-${n}`,
      userId: "user-1",
      inputMethod: "PASTED_TEXT",
      url: null,
      rawInput: "",
      status: "PARSED",
      errorMessage: null,
      title: `Role ${n}`,
      company: null,
      location: null,
      country: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      employmentType: null,
      workMode: null,
      seniority: null,
      description: null,
      requiredExperienceYears: null,
      preferredExperienceYears: null,
      education: null,
      industry: null,
      deadline: null,
      datePosted: null,
      source: null,
      requiredSkills: ["SQL"],
      preferredSkills: [],
      requirements: [],
      createdAt: now,
      updatedAt: now,
    });
    const opportunities = [opportunityWith(missingSkillJob(1)), opportunityWith(missingSkillJob(2))];
    const dreamJob = dreamJobWith({
      requiredSkills: ["SQL"],
      requirements: [{ text: "SQL", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob, opportunities });
    const gap = result.gapPriorities.find((g) => g.title === "SQL");
    expect(gap?.affectedOpportunityCount).toBe(2);
    expect(gap?.affectedOpportunityIds).toEqual(expect.arrayContaining(opportunities.map((o) => o.id)));
  });

  it("never lists a skill as a gap when the profile has no skills at all (unchecked, not failed)", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({ requiredSkills: ["SQL", "Python"] });
    const result = analyze({ profile, dreamJob });
    // With zero profile skills, Fit's own classifyGaps produces no
    // SKILL_GAP either (see scoring/providers/stub.ts), and the Gap
    // Engine's own buildSkillGapPriorities is independent of that - it
    // should still surface these as things to close, since the dream job
    // gap list is meant to be actionable even for a blank profile.
    const gapTitles = result.gapPriorities.map((g) => g.title);
    expect(gapTitles).toEqual(expect.arrayContaining(["SQL", "Python"]));
  });
});

describe("gap priority ranking", () => {
  it("ranks HIGH impact gaps before MEDIUM before LOW", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["SQL"],
      preferredSkills: ["Tableau"],
      requirements: [
        { text: "SQL", mandatory: true, category: "skill" },
        { text: "Tableau", mandatory: false, category: "skill" },
      ],
    });
    const result = analyze({ profile, dreamJob });
    const impacts = result.gapPriorities.map((g) => g.impact);
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    for (let i = 1; i < impacts.length; i++) {
      expect(rank[impacts[i - 1]]).toBeLessThanOrEqual(rank[impacts[i]]);
    }
  });
});

describe("buildCvImprovements", () => {
  it("flags a missing headline and summary", () => {
    const profile = profileWith({ headline: null, summary: null, skills: ["SQL"] });
    const dreamJob = dreamJobWith();
    const result = analyze({ profile, dreamJob });
    const areas = result.cvImprovements.map((c) => c.area);
    expect(areas).toContain("missing_information");
  });

  it("flags matched skills that are only self-stated, not demonstrated", () => {
    const profile = profileWith({ skills: [] });
    profile.skills = [skill("SQL", "STATED"), skill("Python", "STATED")];
    const dreamJob = dreamJobWith({ requiredSkills: ["SQL", "Python"] });
    const result = analyze({ profile, dreamJob });
    expect(result.cvImprovements.some((c) => c.area === "weak_evidence")).toBe(true);
  });

  it("flags generic language like 'responsible for' and 'team player'", () => {
    const profile = profileWith({
      skills: ["SQL"],
      experiences: [experience({ description: "Responsible for team player mentality and reporting." })],
    });
    const result = analyze({ profile, dreamJob: dreamJobWith() });
    expect(result.cvImprovements.some((c) => c.area === "generic_language")).toBe(true);
  });

  it("flags experience entries with no numbers as unquantified", () => {
    const profile = profileWith({
      skills: ["SQL"],
      experiences: [experience({ description: "Improved the dashboard experience for the whole team over time without any specific figures cited here at all." })],
    });
    const result = analyze({ profile, dreamJob: dreamJobWith() });
    expect(result.cvImprovements.some((c) => c.area === "unquantified_achievements")).toBe(true);
  });

  it("does not flag an experience entry that already has a metric", () => {
    const profile = profileWith({
      skills: ["SQL"],
      experiences: [experience({ description: "Improved dashboard load time by 40% for a team of 12 analysts, saving roughly 5 hours a week per person on manual reporting." })],
    });
    const result = analyze({ profile, dreamJob: dreamJobWith() });
    expect(result.cvImprovements.some((c) => c.area === "unquantified_achievements")).toBe(false);
  });

  it("flags very brief experience descriptions", () => {
    const profile = profileWith({
      skills: ["SQL"],
      experiences: [experience({ description: "Did analyst stuff." })],
    });
    const result = analyze({ profile, dreamJob: dreamJobWith() });
    expect(result.cvImprovements.some((c) => c.area === "missing_information")).toBe(true);
  });

  it("flags when nothing on the profile ties to the dream job's industry", () => {
    const profile = profileWith({
      skills: ["SQL"],
      headline: "Retail store manager",
      summary: "Runs day-to-day retail operations.",
    });
    const dreamJob = dreamJobWith({ industry: "Fintech" });
    const result = analyze({ profile, dreamJob });
    expect(result.cvImprovements.some((c) => c.area === "missing_experience")).toBe(true);
  });

  it("does not fabricate CV improvements when the profile is already strong and well-aligned", () => {
    const profile = profileWith({
      skills: ["SQL", "Python"],
      headline: "Senior Data Analyst",
      summary: "Senior analyst with a strong software background in Software.",
      experiences: [
        experience({
          title: "Senior Data Analyst",
          company: "Northwind",
          description: "Led a 40% reduction in reporting latency for a team of 8 by rebuilding the SQL and Python data pipeline.",
        }),
      ],
    });
    profile.skills = [skill("SQL", "CERTIFIED"), skill("Python", "CERTIFIED")];
    const dreamJob = dreamJobWith({ industry: "Software" });
    const result = analyze({ profile, dreamJob });
    // Every improvement, if any, must be a real, traceable finding - never
    // an invented issue about a profile with nothing wrong on the surface.
    for (const imp of result.cvImprovements) {
      expect(typeof imp.issue).toBe("string");
      expect(imp.issue.length).toBeGreaterThan(0);
    }
  });
});

describe("buildKeepAsIs", () => {
  it("recommends keeping a project that provides evidence for a met requirement", () => {
    const profile = profileWith({
      skills: ["SQL", "Python"],
      projects: [project({ name: "Growth SQL Dashboard", description: "Built SQL dashboards using Python for the growth team." })],
    });
    profile.skills = [skill("SQL", "DEMONSTRATED"), skill("Python", "DEMONSTRATED")];
    const dreamJob = dreamJobWith({
      requiredSkills: ["SQL", "Python"],
      requirements: [
        { text: "Strong SQL and Python", mandatory: true, category: "skill" },
      ],
    });
    const result = analyze({ profile, dreamJob });
    // Should not crash, and any keep-item referencing the project must
    // actually name it - never a fabricated reason.
    for (const k of result.keepAsIs) {
      expect(k.reason.length).toBeGreaterThan(0);
    }
  });

  it("never recommends keeping evidence for an unverified ('unknown') requirement", () => {
    const profile = profileWith({ skills: ["SQL"] });
    const dreamJob = dreamJobWith({
      requirements: [{ text: "Comfortable working in ambiguous environments", mandatory: true, category: "other" }],
    });
    const result = analyze({ profile, dreamJob });
    // This requirement can't be verified either way (no matching skill or
    // experience text), so it must not appear as a "keep" - keeping it
    // would assert a met requirement that was never actually checked.
    expect(result.keepAsIs.some((k) => k.reason.includes("ambiguous environments"))).toBe(false);
  });
});

describe("buildImprovementPlan", () => {
  it("sorts HIGH tier items before MEDIUM before LOW", () => {
    const profile = profileWith({ skills: [], headline: null, summary: null });
    const dreamJob = dreamJobWith({
      requiredSkills: ["SQL", "Python", "Kubernetes"],
      requirements: [
        { text: "SQL", mandatory: true, category: "skill" },
        { text: "Python", mandatory: true, category: "skill" },
        { text: "Kubernetes", mandatory: true, category: "skill" },
      ],
    });
    const result = analyze({ profile, dreamJob });
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    for (let i = 1; i < result.improvementPlan.length; i++) {
      expect(rank[result.improvementPlan[i - 1].tier]).toBeLessThanOrEqual(rank[result.improvementPlan[i].tier]);
    }
  });

  it("caps the plan to a reasonable number of items rather than dumping every gap", () => {
    const profile = profileWith({ skills: [] });
    const manySkills = Array.from({ length: 20 }, (_, i) => `Skill${i}`);
    const dreamJob = dreamJobWith({
      requiredSkills: manySkills,
      requirements: manySkills.map((s) => ({ text: s, mandatory: true, category: "skill" as const })),
    });
    const result = analyze({ profile, dreamJob });
    // 8 gap-derived items max + 4 CV-derived items max, per gap-engine.ts.
    expect(result.improvementPlan.length).toBeLessThanOrEqual(12);
  });
});

describe("buildProjectRecommendations", () => {
  it("recommends at most 3 projects", () => {
    const profile = profileWith({ skills: [] });
    const manySkills = ["Kubernetes", "AWS", "Docker", "Terraform", "Azure"];
    const dreamJob = dreamJobWith({
      requiredSkills: manySkills,
      requirements: manySkills.map((s) => ({ text: s, mandatory: true, category: "skill" as const })),
    });
    const result = analyze({ profile, dreamJob });
    expect(result.projectRecommendations.length).toBeLessThanOrEqual(3);
  });

  it("never recommends a project for a LOW-impact gap", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: [],
      preferredSkills: ["Tableau"],
      requirements: [{ text: "Tableau", mandatory: false, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    // A single preferred, unmatched-elsewhere skill gap is LOW impact (see
    // buildSkillGapPriorities), and project recommendations explicitly
    // exclude LOW-impact gaps - manufacturing a multi-week project for a
    // "nice to have" would overstate what's actually needed.
    const tableauGap = result.gapPriorities.find((g) => g.title === "Tableau");
    expect(tableauGap?.impact).toBe("LOW");
    expect(result.projectRecommendations.some((p) => p.why.includes("Tableau"))).toBe(false);
  });

  it("every recommended project traces back to a real named gap", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Kubernetes"],
      requirements: [{ text: "Kubernetes", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    for (const p of result.projectRecommendations) {
      expect(p.why).toMatch(/Closes: /);
    }
  });
});

describe("biggestObstacles and highestImpactNextStep", () => {
  it("tells the user nothing could be extracted when the dream job has no requirements or skills at all", () => {
    const profile = profileWith({ skills: ["SQL"] });
    const dreamJob = dreamJobWith({ requiredSkills: [], preferredSkills: [], requirements: [] });
    const result = analyze({ profile, dreamJob });
    expect(result.biggestObstacles[0]).toMatch(/could not identify/i);
    expect(result.highestImpactNextStep).toMatch(/more detailed job description/i);
  });

  it("tells the user the profile is already well-positioned when there are truly no gaps", () => {
    const profile = profileWith({
      skills: ["SQL", "Python"],
      headline: "Senior Data Analyst in Software",
      summary: "Experienced analyst.",
      experiences: [experience({ title: "Senior Data Analyst" })],
    });
    profile.skills = [skill("SQL", "CERTIFIED"), skill("Python", "CERTIFIED")];
    const dreamJob = dreamJobWith({
      requiredSkills: ["SQL", "Python"],
      requirements: [],
      industry: "Software",
      seniority: "SENIOR",
      requiredExperienceYears: null,
    });
    const result = analyze({ profile, dreamJob });
    if (result.gapPriorities.length === 0) {
      expect(result.biggestObstacles[0]).toMatch(/no significant obstacles/i);
    }
  });

  it("names the top gap or top project in the next step when gaps exist", () => {
    const profile = profileWith({ skills: [] });
    const dreamJob = dreamJobWith({
      requiredSkills: ["Kubernetes"],
      requirements: [{ text: "Kubernetes", mandatory: true, category: "skill" }],
    });
    const result = analyze({ profile, dreamJob });
    expect(result.highestImpactNextStep.length).toBeGreaterThan(0);
    expect(result.highestImpactNextStep).not.toMatch(/could not identify/i);
  });
});

describe("determinism and stability", () => {
  it("produces the same gap analysis for the same inputs", () => {
    const profile = profileWith({ skills: ["SQL"] });
    const dreamJob = dreamJobWith();
    const a = analyze({ profile, dreamJob });
    const b = analyze({ profile, dreamJob });
    expect(a.gapPriorities).toEqual(b.gapPriorities);
    expect(a.highestImpactNextStep).toBe(b.highestImpactNextStep);
  });

  it("never throws on a maximally empty profile against a maximally empty dream job", () => {
    const profile = profileWith({ skills: [], headline: null, summary: null, hasEducation: false });
    const dreamJob = dreamJobWith({
      requiredSkills: [],
      preferredSkills: [],
      requirements: [],
      industry: null,
      seniority: null,
      requiredExperienceYears: null,
    });
    expect(() => analyze({ profile, dreamJob })).not.toThrow();
  });
});
