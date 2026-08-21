import { describe, it, expect } from "vitest";

import { heuristicJobParsingProvider } from "@/lib/ai/providers/job-heuristic";
import { heuristicResumeParsingProvider } from "@/lib/ai/providers/resume-heuristic";

/**
 * The no-AI parsers are not a footnote: with no API key configured they are
 * what every user gets, and what a new user's very first impression is built
 * from. These tests exist because a full end-to-end run scored an obviously
 * well-matched candidate 29/100, and both halves of that were parser bugs:
 *
 *   - every requirement bullet ending in a full stop was discarded, so
 *     requiredSkills came back empty and the 30-point skills component
 *     scored zero "because the posting didn't list specific required skills";
 *   - the CV parser emitted one bogus job per line and no dates, so the
 *     25-point experience component scored zero on "0 years of experience".
 */

const JOB = `Senior Product Analyst — Meridian Commerce
London, United Kingdom (Hybrid, 3 days in office)
£68,000 – £82,000 per year · Full time

Requirements (must have)
- 5+ years of experience in a product or data analytics role.
- Expert SQL. You should be comfortable with window functions and CTEs.
- Strong Python for analysis (pandas, statistical testing).
- Experience with dbt or an equivalent transformation framework.
- A degree in a quantitative subject, or equivalent experience.

Nice to have
- Familiarity with Looker or Tableau.
`;

const CV = `PRIYA SHARMA
London, United Kingdom

EXPERIENCE

Product Analyst - Northwind Retail, London
March 2022 - Present
- Built the A/B testing analysis pipeline in SQL and Python.
- Owned the weekly trading dashboard.

Data Analyst - Harborview Logistics, Manchester
July 2019 - February 2022
- Automated the daily operations report.

EDUCATION
BSc Mathematics and Statistics, University of Manchester
2015 - 2019

SKILLS
SQL, Python, dbt, Tableau, A/B testing, statistics
`;

describe("job description parsing without AI", () => {
  it("extracts required skills from bullets written as sentences", async () => {
    const parsed = await heuristicJobParsingProvider.parseJob(JOB);
    const joined = parsed.requiredSkills.join(" | ").toLowerCase();
    expect(parsed.requiredSkills.length).toBeGreaterThan(0);
    for (const skill of ["sql", "python", "dbt"]) {
      expect(joined, `"${skill}" missing from ${joined}`).toContain(skill);
    }
  });

  it("keeps a nice-to-have out of the required list", async () => {
    const parsed = await heuristicJobParsingProvider.parseJob(JOB);
    expect(parsed.requiredSkills.join(" ").toLowerCase()).not.toContain("looker");
    expect(parsed.preferredSkills.join(" ").toLowerCase()).toContain("looker");
  });

  it("does not file a years-of-experience line as a skill", async () => {
    const parsed = await heuristicJobParsingProvider.parseJob(JOB);
    expect(parsed.requiredSkills.join(" ")).not.toMatch(/5\+ years/);
    expect(parsed.requiredExperienceYears).toBe(5);
  });

  it("does not file a degree requirement as a skill", async () => {
    const parsed = await heuristicJobParsingProvider.parseJob(JOB);
    expect(parsed.requiredSkills.join(" ").toLowerCase()).not.toContain("degree");
  });

  it("does not leave parenthetical fragments in skill names", async () => {
    const parsed = await heuristicJobParsingProvider.parseJob(JOB);
    for (const skill of parsed.requiredSkills) {
      expect(skill, `unbalanced bracket in "${skill}"`).not.toMatch(/[()]/);
    }
  });

  it("invents nothing when the posting says nothing", async () => {
    const parsed = await heuristicJobParsingProvider.parseJob("We are hiring. Apply within.");
    expect(parsed.salaryMin).toBeNull();
    expect(parsed.salaryMax).toBeNull();
    expect(parsed.industry).toBeNull();
    expect(parsed.deadline).toBeNull();
  });
});

describe("CV parsing without AI", () => {
  it("produces one entry per job, not one per line", async () => {
    const parsed = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    expect(parsed.experience).toHaveLength(2);
  });

  it("reads the job title and company apart from each other", async () => {
    const { experience } = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    expect(experience[0].title).toBe("Product Analyst");
    expect(experience[0].company).toBe("Northwind Retail");
    expect(experience[0].location).toBe("London");
    expect(experience[1].title).toBe("Data Analyst");
    expect(experience[1].company).toBe("Harborview Logistics");
  });

  it("never turns a bullet point into a company name", async () => {
    const { experience } = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    for (const role of experience) {
      expect(role.company, `bullet leaked into company: ${role.company}`).not.toMatch(/^[-•*]/);
      expect(role.company.toLowerCase()).not.toContain("automated the daily");
    }
  });

  it("reads the date range, including an open-ended current role", async () => {
    const { experience } = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    expect(experience[0].startDate).toBe("2022-03-01");
    expect(experience[0].isCurrent).toBe(true);
    expect(experience[1].startDate).toBe("2019-07-01");
    expect(experience[1].endDate).toBe("2022-02-01");
  });

  it("derives years of experience from those dates", async () => {
    const { yearsExperience } = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    expect(yearsExperience).not.toBeNull();
    expect(yearsExperience!).toBeGreaterThanOrEqual(5);
  });

  it("returns null years — not zero — when the CV has no dates", async () => {
    // 0 would be a claim the person has never worked. Null says "unknown",
    // which is the only honest reading of a CV with no dates on it.
    const { yearsExperience } = await heuristicResumeParsingProvider.extractCareerProfile(
      "EXPERIENCE\nSomething I did somewhere\n",
    );
    expect(yearsExperience).toBeNull();
  });

  it("marks every extracted entry as unverified", async () => {
    const parsed = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    for (const entry of [...parsed.experience, ...parsed.education, ...parsed.skills]) {
      expect(entry.isUncertain).toBe(true);
    }
    expect(parsed.extractionMethod).toBe("heuristic");
  });

  it("never fabricates transferable skills without a model", async () => {
    const parsed = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    expect(parsed.transferableSkills).toEqual([]);
  });

  it("separates the degree from the institution", async () => {
    const { education } = await heuristicResumeParsingProvider.extractCareerProfile(CV);
    expect(education[0].institution).toBe("University of Manchester");
    expect(education[0].degree).toBe("BSc Mathematics and Statistics");
  });
});
