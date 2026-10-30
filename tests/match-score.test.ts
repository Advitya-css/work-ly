import { describe, expect, it } from "vitest";

import { contentStems, matchResume, untailoredText } from "@/lib/resume/match-score";
import type { TailoredResume } from "@/lib/resume/tailored-resume-core";

const required = [
  "Expert SQL; strong Python (pandas)",
  "Experience with dbt and a cloud warehouse (BigQuery, Snowflake or Redshift)",
  "Designed and analysed A/B tests end to end",
  "Excellent stakeholder communication with senior leaders",
];
const preferred = ["Experience in food delivery", "e-commerce or marketplaces", "Looker or Tableau", "Causal inference methods"];

describe("contentStems", () => {
  it("keeps what a requirement is about and drops how it's phrased", () => {
    expect(contentStems("Expert SQL; strong Python")).toEqual(["sql", "python"]);
    expect(contentStems("Designed and analysed A/B tests end to end")).toEqual(["abtest", "test"]);
  });
});

describe("matchResume", () => {
  const resumeText = `Data Analyst, QuickBite
• Built 40+ dbt models on BigQuery powering delivery-operations dashboards.
• Ran 18 A/B tests on checkout and delivery fees; one lifted conversion 3.2%.
SKILLS dbt, BigQuery, A/B testing, SQL, Python, Looker`;

  it("credits a requirement the resume shows, in any word form", () => {
    const m = matchResume({ required, preferred, resumeText, profileText: "" });
    const state = (t: string) => m.items.find((i) => i.text.startsWith(t))?.state;
    expect(state("Expert SQL")).toBe("resume");
    expect(state("Designed and analysed A/B")).toBe("resume");
    // BigQuery is one of the named examples of a cloud warehouse.
    expect(state("Experience with dbt")).toBe("resume");
    expect(state("Looker or Tableau")).toBe("resume");
  });

  it("separates 'on your profile, not in this resume' from a real gap", () => {
    const m = matchResume({
      required,
      preferred,
      resumeText,
      profileText: "Presented weekly to senior leaders; stakeholder communication",
    });
    const state = (t: string) => m.items.find((i) => i.text.startsWith(t))?.state;
    expect(state("Excellent stakeholder")).toBe("profile");
    expect(state("Causal inference")).toBe("missing");
  });

  it("weights must-haves double", () => {
    const m = matchResume({ required: ["SQL"], preferred: ["Tableau"], resumeText: "SQL", profileText: "" });
    expect(m.score).toBe(67);
    expect(m.mustShown).toBe(1);
    expect(m.mustTotal).toBe(1);
  });
});

describe("untailoredText", () => {
  it("rebuilds the resume in the candidate's own words", () => {
    const resume = {
      summary: "Tailored summary",
      roles: [{ title: "Analyst", company: "Acme", location: null, dates: "", bullets: ["New wording"], from: ["Old wording"] }],
      projects: [],
      skills: ["SQL"],
      education: [],
      certifications: [],
      keywordsCovered: [],
      keywordsMissing: [],
      unverifiedNumbers: [],
    } satisfies TailoredResume;
    const text = untailoredText(resume, { summary: "Profile summary", skills: ["Excel"] });
    expect(text).toContain("Old wording");
    expect(text).not.toContain("New wording");
    expect(text).toContain("Profile summary");
    expect(text).toContain("Excel");
  });
});
