import { describe, expect, it } from "vitest";

import {
  groundJobExtraction,
  groundResumeExtraction,
} from "@/lib/ai/grounding";
import type { ExtractedJob } from "@/lib/ai/job-parser-types";
import type { ExtractedCareerProfile } from "@/lib/ai/resume-parser-types";

/**
 * Grounding is the last line of defence between a model's imagination and
 * the user's career profile. These tests pin both halves of the tradeoff:
 * invented employers, skills and salaries must not survive, and a skill the
 * parser merely reformatted ("ReactJS" in the CV, "React" in the JSON) must.
 * The second half matters as much as the first, because a filter that eats
 * real data teaches people to ignore the review screen.
 */

const CV = `PRIYA SHARMA
Senior Data Analyst
London, United Kingdom - priya.sharma@example.com

PROFESSIONAL EXPERIENCE

Data Analyst, Northwind Retail (London)
March 2022 - Present
- Built the A/B testing analysis pipeline using SQL and Python.
- Rebuilt the internal reporting app in ReactJS.
- Presented weekly trading results to the commercial leadership team.

Junior Analyst, Harborview Logistics (Manchester)
July 2019 - February 2022
- Automated the daily operations report, saving roughly 6 hours a week.

EDUCATION
BSc Mathematics and Statistics, University of Manchester, 2015 - 2019

CERTIFICATIONS
Google Data Analytics Professional Certificate, 2021

PROJECTS
Allotment Yield Tracker - a small C++ command line tool for logging crop yields.

SKILLS
SQL, Python, ReactJS, dbt, Tableau, experiment design
`;

const JOB = `Senior Product Analyst at Meridian Commerce
London, United Kingdom (hybrid, 3 days in office)
GBP 68,000 - 82,000 per year, full time

About the role
You will own the analytics behind our checkout funnel and report to the Head of Product.

Requirements
- 5+ years of experience in a product or data analytics role.
- Expert SQL, including window functions and CTEs.
- Strong Python for analysis.
- Experience with dbt or an equivalent transformation framework.

Nice to have
- Familiarity with Tableau.
`;

function emptyProfile(): ExtractedCareerProfile {
  return {
    headline: "Senior Data Analyst with a decade of commercial impact",
    summary:
      "Synthesised prose that intentionally uses words the CV never used.",
    yearsExperience: 6,
    education: [],
    experience: [],
    projects: [],
    skills: [],
    achievements: [],
    certifications: [],
    transferableSkills: [],
    extractionMethod: "ai",
  };
}

function emptyJob(): ExtractedJob {
  return {
    title: null,
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
    requiredSkills: [],
    preferredSkills: [],
    requirements: [],
    extractionMethod: "ai",
  };
}

function skill(name: string): ExtractedCareerProfile["skills"][number] {
  return {
    name,
    category: "TECHNICAL",
    evidenceLevel: "STATED",
    isUncertain: false,
  };
}

function experience(
  company: string,
  title: string,
): ExtractedCareerProfile["experience"][number] {
  return {
    company,
    title,
    startDate: "2022-03",
    isCurrent: true,
    isUncertain: false,
  };
}

describe("groundResumeExtraction", () => {
  it("drops an employer that appears nowhere in the CV", () => {
    const report = groundResumeExtraction(
      {
        ...emptyProfile(),
        experience: [
          experience("Northwind Retail", "Data Analyst"),
          experience("Globex Corporation", "Lead Data Scientist"),
        ],
      },
      CV,
    );

    expect(report.grounded.experience.map((e) => e.company)).toEqual([
      "Northwind Retail",
    ]);
    expect(report.dropped).toContainEqual(
      expect.objectContaining({
        field: "experience.company",
        value: "Globex Corporation",
      }),
    );
  });

  it("drops a skill the CV never mentions", () => {
    const report = groundResumeExtraction(
      { ...emptyProfile(), skills: [skill("SQL"), skill("Kubernetes")] },
      CV,
    );

    expect(report.grounded.skills.map((s) => s.name)).toEqual(["SQL"]);
    expect(report.dropped).toEqual([
      expect.objectContaining({ field: "skills", value: "Kubernetes" }),
    ]);
  });

  it("keeps a skill the parser legitimately reformatted", () => {
    // The CV says "ReactJS" and "C++"; the parser writes "React" and "C ++"
    // (a routine PDF text-extraction artefact). Neither is a hallucination
    // and neither may be dropped.
    const report = groundResumeExtraction(
      {
        ...emptyProfile(),
        skills: [skill("React"), skill("C ++"), skill("A/B testing")],
      },
      CV,
    );

    expect(report.grounded.skills.map((s) => s.name)).toEqual([
      "React",
      "C ++",
      "A/B testing",
    ]);
    expect(report.dropped).toEqual([]);
    expect(report.groundedRatio).toBe(1);
  });

  it("drops an invented institution while keeping the real one", () => {
    const report = groundResumeExtraction(
      {
        ...emptyProfile(),
        education: [
          {
            institution: "University of Manchester",
            degree: "BSc",
            isUncertain: false,
          },
          {
            institution: "Stanford University",
            degree: "MSc",
            isUncertain: false,
          },
        ],
      },
      CV,
    );

    expect(report.grounded.education.map((e) => e.institution)).toEqual([
      "University of Manchester",
    ]);
    expect(report.dropped[0]?.field).toBe("education.institution");
  });

  it("keeps transferable skills, whose names are inferred rather than quoted", () => {
    const report = groundResumeExtraction(
      {
        ...emptyProfile(),
        transferableSkills: [
          {
            name: "Stakeholder communication",
            category: "SOFT",
            rationale:
              "Presented weekly trading results to the commercial leadership team.",
          },
        ],
      },
      CV,
    );

    expect(report.grounded.transferableSkills).toHaveLength(1);
    expect(report.dropped).toEqual([]);
    // The rationale quotes the CV, so it counts as a grounded claim.
    expect(report.groundedRatio).toBe(1);
  });

  it("passes a fully grounded extraction through unchanged with ratio 1", () => {
    const extracted: ExtractedCareerProfile = {
      ...emptyProfile(),
      skills: [skill("SQL"), skill("Python"), skill("dbt"), skill("Tableau")],
      experience: [
        experience("Northwind Retail", "Data Analyst"),
        experience("Harborview Logistics", "Junior Analyst"),
      ],
      education: [
        {
          institution: "University of Manchester",
          degree: "BSc",
          fieldOfStudy: "Mathematics and Statistics",
          isUncertain: false,
        },
      ],
      certifications: [
        {
          name: "Google Data Analytics Professional Certificate",
          isUncertain: false,
        },
      ],
      projects: [{ name: "Allotment Yield Tracker", isUncertain: false }],
      achievements: [
        { title: "Automated the daily operations report", isUncertain: false },
      ],
      transferableSkills: [
        {
          name: "Stakeholder communication",
          category: "SOFT",
          rationale:
            "Presented weekly trading results to the commercial leadership team.",
        },
      ],
    };

    const report = groundResumeExtraction(extracted, CV);

    expect(report.dropped).toEqual([]);
    expect(report.grounded).toEqual(extracted);
    expect(report.groundedRatio).toBe(1);
  });

  it("computes the ratio over checkable claims only", () => {
    // Six checkable claims: four skills (two invented) plus one experience
    // company and its title (both real). The headline and summary are
    // synthesised prose and must not enter the denominator.
    const report = groundResumeExtraction(
      {
        ...emptyProfile(),
        skills: [
          skill("SQL"),
          skill("Python"),
          skill("Kubernetes"),
          skill("Terraform"),
        ],
        experience: [experience("Northwind Retail", "Data Analyst")],
      },
      CV,
    );

    expect(report.dropped).toHaveLength(2);
    expect(report.groundedRatio).toBeCloseTo(4 / 6, 4);
  });

  it("returns ratio 1 when there is nothing to check", () => {
    const report = groundResumeExtraction(emptyProfile(), CV);
    expect(report.groundedRatio).toBe(1);
    expect(report.dropped).toEqual([]);
  });
});

describe("groundJobExtraction", () => {
  it("nulls a salary figure that is not in the posting and keeps the one that is", () => {
    const report = groundJobExtraction(
      {
        ...emptyJob(),
        salaryMin: 68000,
        salaryMax: 95000,
        requiredExperienceYears: 5,
      },
      JOB,
    );

    expect(report.grounded.salaryMin).toBe(68000);
    expect(report.grounded.salaryMax).toBeNull();
    expect(report.grounded.requiredExperienceYears).toBe(5);
    expect(report.dropped).toEqual([
      expect.objectContaining({ field: "salaryMax", value: "95000" }),
    ]);
  });

  it("reads 80k style shorthand as 80000", () => {
    const report = groundJobExtraction(
      { ...emptyJob(), salaryMin: 80000, salaryMax: 100000 },
      "Salary: 80k - 100k depending on experience.",
    );

    expect(report.grounded.salaryMin).toBe(80000);
    expect(report.grounded.salaryMax).toBe(100000);
    expect(report.dropped).toEqual([]);
  });

  it("drops invented skills and requirements but keeps the posting", () => {
    const report = groundJobExtraction(
      {
        ...emptyJob(),
        title: "Senior Product Analyst",
        company: "Meridian Commerce",
        location: "Berlin, Germany",
        requiredSkills: ["SQL", "Python", "Kubernetes"],
        preferredSkills: ["Tableau", "Salesforce"],
        requirements: [
          {
            text: "5+ years of experience in a product or data analytics role",
            mandatory: true,
            category: "experience",
          },
          {
            text: "Active security clearance required",
            mandatory: true,
            category: "other",
          },
        ],
      },
      JOB,
    );

    expect(report.grounded.requiredSkills).toEqual(["SQL", "Python"]);
    expect(report.grounded.preferredSkills).toEqual(["Tableau"]);
    expect(report.grounded.requirements).toHaveLength(1);
    // A wrong location nulls the field rather than discarding the job.
    expect(report.grounded.location).toBeNull();
    expect(report.grounded.title).toBe("Senior Product Analyst");
    expect(report.grounded.company).toBe("Meridian Commerce");
    expect(report.dropped.map((d) => d.field).sort()).toEqual([
      "location",
      "preferredSkills",
      "requiredSkills",
      "requirements",
    ]);
  });

  it("passes a fully grounded posting through unchanged with ratio 1", () => {
    const extracted: ExtractedJob = {
      ...emptyJob(),
      title: "Senior Product Analyst",
      company: "Meridian Commerce",
      location: "London, United Kingdom",
      salaryMin: 68000,
      salaryMax: 82000,
      requiredExperienceYears: 5,
      description:
        "A synthesised summary of the role written in the parser's own words.",
      requiredSkills: ["SQL", "Python", "dbt"],
      preferredSkills: ["Tableau"],
      requirements: [
        {
          text: "Expert SQL, including window functions and CTEs",
          mandatory: true,
          category: "skill",
        },
      ],
    };

    const report = groundJobExtraction(extracted, JOB);

    expect(report.dropped).toEqual([]);
    expect(report.grounded).toEqual(extracted);
    expect(report.groundedRatio).toBe(1);
  });
});
