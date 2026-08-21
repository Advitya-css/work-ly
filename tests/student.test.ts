import { describe, it, expect } from "vitest";

import {
  classifyStudentJob,
  limitsFor,
  rulesForCountry,
  COUNTRY_RULES,
} from "@/lib/student/legal-limits";
import { matchInternships, dreamGaps } from "@/lib/student/internship-match";
import type { Skill, OpportunityWithJob, Job } from "@/lib/db/types";

const now = new Date();

function skill(name: string): Skill {
  return {
    id: `skill-${name}`,
    careerProfileId: "p1",
    name,
    category: "TECHNICAL",
    proficiency: "INTERMEDIATE",
    experienceLevel: "ONE_TO_3_YEARS",
    evidenceLevel: "DEMONSTRATED",
    source: "USER",
    recency: "CURRENT",
    isTransferable: false,
    transferableRationale: null,
    createdAt: now,
    updatedAt: now,
  };
}

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "j1",
    userId: "u1",
    inputMethod: "PASTED_TEXT",
    url: null,
    rawInput: "",
    status: "PARSED",
    errorMessage: null,
    title: "Intern",
    company: "Acme",
    location: "London",
    country: "United Kingdom",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    employmentType: "INTERNSHIP",
    workMode: "ONSITE",
    seniority: "ENTRY",
    description: "",
    requiredExperienceYears: null,
    preferredExperienceYears: null,
    education: null,
    industry: null,
    deadline: null,
    datePosted: null,
    source: null,
    requiredSkills: [],
    preferredSkills: [],
    requirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function opportunity(j: Job, id = "o1"): OpportunityWithJob {
  return {
    id,
    userId: "u1",
    jobId: j.id,
    jobAnalysisId: null,
    status: "DISCOVERED",
    recommendation: "CONSIDER",
    competitiveness: "MEDIUM",
    fitScore: 50,
    priorityScore: 50,
    priorityBreakdown: null,
    isSaved: false,
    discoveredAt: now,
    createdAt: now,
    updatedAt: now,
    job: j,
    analysis: null,
  } as unknown as OpportunityWithJob;
}

/**
 * The classifier decides which work-hour rules get shown next to a job, so
 * a false "on campus" is the one mistake here with real consequences: it
 * would attach a 20-hour-a-week campus note to a role that is nothing of
 * the sort. These tests pin the conservative behaviour down.
 */
describe("classifyStudentJob", () => {
  const base = { employmentType: null, description: null, location: null, university: null };

  it("calls anything marked as an internship an internship, whatever the employer", () => {
    expect(
      classifyStudentJob({ ...base, title: "Summer Analyst", company: "Big Bank", employmentType: "INTERNSHIP" }),
    ).toBe("internship");
  });

  it("reads internship out of the title too", () => {
    expect(classifyStudentJob({ ...base, title: "Data Science Internship", company: "Acme" })).toBe(
      "internship",
    );
  });

  it("treats the student's own university as on campus", () => {
    expect(
      classifyStudentJob({
        ...base,
        title: "Office Assistant",
        company: "University of Manchester",
        university: "University of Manchester",
      }),
    ).toBe("on-campus");
  });

  it("recognises campus employers generally", () => {
    expect(classifyStudentJob({ ...base, title: "Server", company: "Campus Dining Services" })).toBe(
      "on-campus",
    );
  });

  it("recognises campus role titles", () => {
    expect(classifyStudentJob({ ...base, title: "Resident Adviser", company: "Somewhere" })).toBe(
      "on-campus",
    );
  });

  it("defaults to off campus rather than guessing on campus", () => {
    // The safe default: an ordinary retail job must not inherit campus rules.
    expect(classifyStudentJob({ ...base, title: "Barista", company: "Coffee Chain Ltd" })).toBe(
      "off-campus",
    );
  });

  it("does not mistake a university-adjacent word in a normal employer name", () => {
    expect(classifyStudentJob({ ...base, title: "Barista", company: "Acme Coffee" })).toBe("off-campus");
  });
});

describe("legal limits", () => {
  it("returns nothing at all when the country is unknown", () => {
    // Showing no limit is correct here. Defaulting to one country's rules
    // for a student studying in another would be worse than silence.
    expect(limitsFor(null, "on-campus")).toEqual([]);
    expect(rulesForCountry(null)).toBeNull();
  });

  it("every limit cites an official source", () => {
    for (const country of COUNTRY_RULES) {
      for (const kind of ["on-campus", "off-campus", "internship"] as const) {
        for (const limit of country.limits[kind]) {
          expect(limit.sourceUrl, `${country.code}/${kind} has no source`).toMatch(/^https:\/\//);
          expect(limit.sourceName.length).toBeGreaterThan(3);
          expect(limit.confirmWith.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("states the sourced US on-campus hour limit", () => {
    const [limit] = limitsFor("US", "on-campus");
    expect(limit.headline).toMatch(/20 hours/);
    expect(limit.sourceUrl).toContain("ice.gov");
  });

  it("marks countries whose figures could not be sourced, and prints no number for them", () => {
    const uk = rulesForCountry("GB");
    expect(uk?.unverified).toBe(true);
    // The honesty rule: no invented hour figure anywhere in an unverified set.
    for (const kind of ["on-campus", "off-campus", "internship"] as const) {
      for (const limit of uk!.limits[kind]) {
        expect(`${limit.headline} ${limit.detail}`).not.toMatch(/\b\d+\s*hours? (a|per) week\b/);
      }
    }
  });

  it("never asks about or refers to the reader's own immigration status", () => {
    for (const country of COUNTRY_RULES) {
      for (const kind of ["on-campus", "off-campus", "internship"] as const) {
        for (const limit of country.limits[kind]) {
          expect(limit.detail).not.toMatch(/your (visa status|immigration status)/i);
        }
      }
    }
  });
});

describe("matchInternships", () => {
  const studentSkills = [skill("Python")];
  const dreamSkills = ["Python", "SQL", "Machine Learning"];

  it("identifies the dream-role skills the student does not have yet", () => {
    expect(dreamGaps(dreamSkills, studentSkills).sort()).toEqual(["Machine Learning", "SQL"]);
  });

  it("ranks the internship that closes more gaps above one that closes none", () => {
    const closesTwo = opportunity(
      job({ id: "a", title: "ML Intern", requiredSkills: ["SQL", "Machine Learning"] }),
      "o-a",
    );
    const closesNone = opportunity(
      job({ id: "b", title: "Admin Intern", requiredSkills: ["Filing"] }),
      "o-b",
    );

    const [first, second] = matchInternships({
      internships: [closesNone, closesTwo],
      dreamSkills,
      studentSkills,
      major: null,
    });

    expect(first.opportunity.id).toBe("o-a");
    expect(first.closesGaps.sort()).toEqual(["Machine Learning", "SQL"]);
    expect(second.closesGaps).toEqual([]);
  });

  it("separates skills that close a gap from ones the student already has", () => {
    const match = matchInternships({
      internships: [opportunity(job({ requiredSkills: ["Python", "SQL"] }))],
      dreamSkills,
      studentSkills,
      major: null,
    })[0];

    expect(match.closesGaps).toEqual(["SQL"]);
    expect(match.reinforces).toEqual(["Python"]);
  });

  it("keeps the score inside 0-100 and never mentions odds of being hired", () => {
    const matches = matchInternships({
      internships: [
        opportunity(job({ id: "a", requiredSkills: ["SQL", "Machine Learning"] }), "o-a"),
        opportunity(job({ id: "b", requiredSkills: [] }), "o-b"),
      ],
      dreamSkills,
      studentSkills,
      major: "Computer Science",
    });

    for (const match of matches) {
      expect(match.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(match.relevanceScore).toBeLessThanOrEqual(100);
      expect(match.reasoning).not.toMatch(/chance|odds|probability|likely to get/i);
    }
  });

  it("does not rank everything last just because the student has no gaps", () => {
    const matches = matchInternships({
      internships: [opportunity(job({ requiredSkills: ["Python"] }))],
      dreamSkills: ["Python"],
      studentSkills,
      major: null,
    });
    expect(matches[0].relevanceScore).toBeGreaterThan(0);
  });

  it("survives having no dream role to compare against", () => {
    const matches = matchInternships({
      internships: [opportunity(job({ requiredSkills: ["Python"] }))],
      dreamSkills: [],
      studentSkills,
      major: null,
    });
    expect(matches).toHaveLength(1);
    expect(Number.isFinite(matches[0].relevanceScore)).toBe(true);
  });
});
