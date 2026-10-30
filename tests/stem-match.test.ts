import { describe, expect, it } from "vitest";

import { stemmedPhraseIn } from "../src/lib/scoring/stem-match";

describe("word-form tolerant skill matching", () => {
  it("matches the same skill in another word form", () => {
    expect(stemmedPhraseIn("A/B testing", "Designed and analysed A/B tests end to end")).toBe(true);
    expect(stemmedPhraseIn("Data modeling", "Strong data models in dbt")).toBe(true);
    expect(stemmedPhraseIn("Dashboards", "Built dashboard tooling")).toBe(true);
  });
  it("stays strict where a loose match would be wrong", () => {
    expect(stemmedPhraseIn("Go", "Own the go-to-market plan")).toBe(false);
    expect(stemmedPhraseIn("Java", "JavaScript and TypeScript")).toBe(false);
    expect(stemmedPhraseIn("A/B testing", "Load testing at scale")).toBe(false);
  });
});
