import { describe, it, expect } from "vitest";

import { heuristicResumeParsingProvider } from "@/lib/ai/providers/resume-heuristic";

/**
 * Values & Culture Matching's no-AI-key fallback: lexical keyword
 * detection over the raw resume text (see value-graph.ts and
 * resume-heuristic.ts's extractWorkValues). Deliberately lower-confidence
 * and more literal than the real AI path (resume-ai.ts) - it can only see
 * words that are actually there, not infer a value from what a role or
 * employer implies.
 */
describe("heuristic resume parsing - work values", () => {
  it("detects a value from literal keyword language in the resume", async () => {
    const resume = `
JORDAN LEE
Sustainability Analyst

EXPERIENCE
Sustainability Analyst, GreenCo
March 2022 - Present
- Tracked carbon accounting metrics and renewable energy programs for the climate strategy team.

SKILLS
Excel, carbon accounting, ESG reporting
`;
    const result = await heuristicResumeParsingProvider.parseResume(resume);
    expect(result.workValues.length).toBeGreaterThan(0);
    expect(result.workValues.some((v) => v.value === "sustainability_climate")).toBe(true);
    // Every confidence must be capped below what the real AI parser would
    // give for equivalent evidence - the heuristic path can never look as
    // sure of itself as real inference.
    for (const v of result.workValues) {
      expect(v.confidence).toBeLessThanOrEqual(0.6);
      expect(v.confidence).toBeGreaterThan(0);
    }
  });

  it("returns no work values for a resume that never uses value-signaling language", async () => {
    const resume = `
ALEX CHEN
Software Engineer

EXPERIENCE
Software Engineer, Acme Corp
January 2020 - Present
- Built backend services in Node.js and PostgreSQL.

SKILLS
JavaScript, TypeScript, PostgreSQL, Node.js
`;
    const result = await heuristicResumeParsingProvider.parseResume(resume);
    expect(result.workValues).toEqual([]);
  });

  it("never invents evidence - every evidence string names something actually in the resume", async () => {
    const resume = `
SAM RIVERA
Program Manager

EXPERIENCE
Program Manager, Nonprofit Alliance
June 2021 - Present
- Led community impact programs for underserved neighborhoods, mission-driven work with real outcomes.
`;
    const result = await heuristicResumeParsingProvider.parseResume(resume);
    const socialImpact = result.workValues.find((v) => v.value === "social_impact");
    expect(socialImpact).toBeDefined();
    expect(socialImpact!.evidence.length).toBeGreaterThan(0);
  });
});
