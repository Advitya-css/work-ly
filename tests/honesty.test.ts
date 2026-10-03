import { describe, expect, it } from "vitest";

import { stretchesClaims } from "@/lib/ai/honesty";
import { sanitizeBlocks } from "@/lib/dream-job/sprint-plan-core";

describe("stretchesClaims", () => {
  it("flags advice to claim more than the profile shows", () => {
    expect(stretchesClaims("State 5+ years of advanced analytics in your summary.")).toBe(true);
    expect(stretchesClaims("Highlight your 3 years leading experiments on the resume")).toBe(true);
    expect(stretchesClaims("Say you led the data platform migration")).toBe(true);
    expect(stretchesClaims("Round up your experience to five years")).toBe(true);
  });

  it("leaves honest advice alone", () => {
    expect(stretchesClaims("Build a churn model on a public dataset and publish the notebook.")).toBe(false);
    expect(stretchesClaims("If you have run A/B tests at work, add a bullet with the result.")).toBe(false);
    expect(stretchesClaims("Complete the Google Data Analytics certificate (about 6 months).")).toBe(false);
    expect(stretchesClaims(null)).toBe(false);
  });
});

describe("sanitizeBlocks drops dishonest advice", () => {
  const gaps = ["SQL", "A/B testing"];
  const block = (actions: string[], deliverable = "A published analysis") => ({
    startWeek: 1,
    endWeek: 2,
    focus: "SQL",
    closes: ["SQL"],
    actions,
    deliverable,
    doneWhen: "The analysis is live",
  });

  it("removes a stretching action but keeps the block when two honest ones remain", () => {
    const [b] = sanitizeBlocks(
      [block(["Finish SQLBolt lessons 1-12", "State 5+ years of SQL on your resume", "Write 10 queries on a public dataset"])],
      gaps,
      8,
    );
    expect(b.actions).toEqual(["Finish SQLBolt lessons 1-12", "Write 10 queries on a public dataset"]);
  });

  it("drops a block whose deliverable is a stretched claim", () => {
    expect(
      sanitizeBlocks([block(["Do X", "Do Y"], "A resume that states 5 years of SQL")], gaps, 8),
    ).toEqual([]);
  });
});
