import { describe, expect, it } from "vitest";

import { addedWords, cleanEditedResume, resumeAsText, resumeChangeStats } from "../src/lib/resume/tailored-resume-core";

const base = {
  summary: "Data analyst.",
  roles: [
    {
      title: "Data Analyst",
      company: "QuickBite",
      location: null,
      dates: "Mar 2023 – Present",
      bullets: ["Built 40+ dbt data models", "", "Automated weekly reporting"],
      from: ["Built 40+ dbt models", null, null],
      added: [[], [], []],
    },
  ],
  projects: [],
  skills: ["SQL"],
  education: [{ line: "B.Sc. Statistics", dates: "2021" }],
  certifications: [],
  keywordsCovered: [],
  keywordsMissing: [],
  unverifiedNumbers: [],
  leftOut: 2,
};

describe("tailored resume editing", () => {
  it("drops lines the user cleared, keeping each remaining line's original", () => {
    const clean = cleanEditedResume(base)!;
    expect(clean.roles[0].bullets).toEqual(["Built 40+ dbt data models", "Automated weekly reporting"]);
    expect(clean.roles[0].from).toEqual(["Built 40+ dbt models", null]);
  });
  it("rejects anything that isn't a resume", () => {
    expect(cleanEditedResume("hello")).toBeNull();
    expect(cleanEditedResume(null)).toBeNull();
  });
  it("counts what changed, ignoring cleared lines", () => {
    expect(resumeChangeStats(base as never)).toEqual({ rewritten: 1, kept: 1, leftOut: 2, toCheck: 0 });
  });
  it("copies as clean text with no empty bullets", () => {
    const text = resumeAsText(base as never, { name: "Priya Sharma", headline: "Data Analyst", contact: "p@example.test" });
    expect(text).toContain("• Built 40+ dbt data models");
    expect(text).not.toMatch(/•\s*\n/);
  });
});

describe("words a rewrite added", () => {
  const profile = "Ran 18 A/B tests on checkout. Built dbt models for the delivery-ops dashboards used by the ops team.";
  it("flags new claims", () => {
    expect(addedWords("Designed and ran 18 A/B tests with marketing", "Ran 18 A/B tests on checkout", profile)).toEqual(["designed", "marketing"]);
  });
  it("lets ordinary rephrasing through", () => {
    expect(addedWords("Built dbt data models powering delivery-operations dashboards", "Built dbt models for the delivery-ops dashboards", profile + " data")).toEqual([
      "powering",
    ]);
  });
});

import { lacksResult, polishResume, tidyEducationLine, tidySkill } from "@/lib/resume/tailored-resume-core";

describe("resume finishing touches", () => {
  it("drops a field of study already in the degree", () => {
    expect(tidyEducationLine("Bachelor of Architecture, Architecture — University of Mumbai")).toBe("Bachelor of Architecture — University of Mumbai");
    expect(tidyEducationLine("B.Sc., Statistics — University of Pune")).toBe("B.Sc., Statistics — University of Pune");
  });

  it("puts the most recent degree first and evens out skill casing", () => {
    const r = polishResume({
      education: [
        { line: "B.Arch — Mumbai", dates: "May 2021" },
        { line: "Master of City Planning — Penn", dates: "May 2024" },
      ],
      skills: ["data visualization & dashboards", "dbt", "Public Speaking", "dbt"],
    });
    expect(r.education[0].line).toContain("Master");
    expect(r.skills).toEqual(["Data visualization & dashboards", "dbt", "Public Speaking"]);
    expect(tidySkill("pandas")).toBe("pandas");
  });

  it("spots a line with no result", () => {
    expect(lacksResult("Shipped two client-facing web products from prototype to launch.")).toBe(true);
    expect(lacksResult("Secured and administered a $200,000 grant for a heat-mitigation project.")).toBe(false);
    expect(lacksResult("Automated weekly reporting in Python, saving the ops team 6 hours a week.")).toBe(false);
  });
});
