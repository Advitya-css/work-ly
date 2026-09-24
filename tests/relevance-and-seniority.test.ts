import { describe, expect, it } from "vitest";

import { titleIsRelevant } from "@/lib/discovery/relevance";
import { normalizeListing } from "@/lib/discovery/normalize";

describe("titleIsRelevant", () => {
  const targets = ["Analytics Engineer", "BI Analyst", "Senior Data Analyst", "Data Analyst"];
  it("keeps listings in the same field", () => {
    for (const t of ["Data Analyst - SQL / Databricks", "Senior Data Scientist", "Business Intelligence Analyst", "Analytics Engineer II"]) {
      expect(titleIsRelevant(t, targets)).toBe(true);
    }
  });
  it("drops listings from unrelated fields", () => {
    for (const t of ["Frontend Web Application Developer", "Senior Shopify Developer", "Freelance Copywriter", "Tier III Service Desk Engineer", "Inside Sales Contractor", "AI Response Evaluator", "Senior DevOps Engineer"]) {
      expect(titleIsRelevant(t, targets)).toBe(false);
    }
  });
  it("passes everything when the targets carry no field words", () => {
    expect(titleIsRelevant("Anything", ["Senior Engineer"])).toBe(true);
    expect(titleIsRelevant("Anything", [])).toBe(true);
  });
});

describe("seniority from descriptions", () => {
  const base = { externalId: "x", title: "Freelance Writer", company: "Acme", location: "Remote", url: "https://example.com/j", postedAt: new Date() };
  it("does not call a job LEAD because the description mentions leads or managers", () => {
    const l = normalizeListing({ ...base, description: "You will write lead generation content and report to our marketing manager." } as never);
    expect(l.seniority).toBeNull();
  });
  it("reads explicit years of experience", () => {
    const l = normalizeListing({ ...base, title: "Data Analyst", description: "You have 5+ years of experience with SQL." } as never);
    expect(l.seniority).toBe("SENIOR");
  });
  it("still reads levels from the title", () => {
    const l = normalizeListing({ ...base, title: "Senior Data Analyst", description: "" } as never);
    expect(l.seniority).toBe("SENIOR");
  });
  it("does not treat an Account Manager title as LEAD", () => {
    const l = normalizeListing({ ...base, title: "Account Manager", description: "" } as never);
    expect(l.seniority).not.toBe("LEAD");
  });
});
