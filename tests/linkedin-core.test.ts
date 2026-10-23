import { describe, expect, it } from "vitest";

import { claimsUnheldTitle, cleanMakeoverEdits, cleanSkills } from "../src/lib/career/linkedin-core";

describe("LinkedIn makeover rules", () => {
  it("rejects a headline that wears a title the person has never held", () => {
    expect(claimsUnheldTitle("Analytics Manager | dbt, SQL", "Analytics Manager", ["Data Analyst"])).toBe(true);
    expect(claimsUnheldTitle("Senior Analytics Manager · experiments", "Analytics Manager", ["Data Analyst"])).toBe(true);
  });
  it("allows moving toward the role, or a title they hold", () => {
    expect(claimsUnheldTitle("Data Analyst moving into analytics management | dbt", "Analytics Manager", ["Data Analyst"])).toBe(false);
    expect(claimsUnheldTitle("Analytics Manager | Retail", "Analytics Manager", ["Analytics Manager"])).toBe(false);
    expect(claimsUnheldTitle("Data Analyst | dbt", null, ["Data Analyst"])).toBe(false);
  });
  it("only pins skills that are on the profile", () => {
    expect(cleanSkills(["dbt", "Airflow", "sql", "dbt"], ["dbt", "SQL", "Python"])).toEqual(["dbt", "SQL"]);
  });
  it("caps edits at LinkedIn's limits", () => {
    const current = { targetRole: null, headlines: [{ text: "a", angle: "x" }], about: "b", topSkills: [], unverifiedNumbers: [] };
    const next = cleanMakeoverEdits(current, { about: "z".repeat(3000), headlines: ["h".repeat(300), "extra"] });
    expect(next.about).toHaveLength(2600);
    expect(next.headlines).toHaveLength(1);
    expect(next.headlines[0].text).toHaveLength(220);
    expect(current.headlines[0].text).toBe("a");
  });
});
