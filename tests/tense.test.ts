import { describe, expect, it } from "vitest";
import { matchSourceTense, toPast } from "@/lib/resume/tense";

describe("matchSourceTense", () => {
  it("puts a base-form rewrite of a past-tense line into the past", () => {
    expect(matchSourceTense("Build 40+ dbt models on BigQuery", "Built 40+ dbt models on BigQuery")).toBe("Built 40+ dbt models on BigQuery");
    expect(matchSourceTense("Construct 40+ dbt models", "Built 40+ dbt models")).toBe("Constructed 40+ dbt models");
    expect(matchSourceTense("Design and analyze A/B tests", "Designed and analysed A/B tests")).toBe("Designed and analyzed A/B tests");
    expect(matchSourceTense("Deliver Power BI dashboards", "Delivered Power BI dashboards")).toBe("Delivered Power BI dashboards");
    expect(matchSourceTense("Reduce the weekly run", "Cut the weekly run")).toBe("Reduced the weekly run");
    expect(matchSourceTense("Write SQL to reconcile data", "Wrote SQL to reconcile data")).toBe("Wrote SQL to reconcile data");
  });
  it("leaves correct or present-tense sources alone", () => {
    expect(matchSourceTense("Engineered pipelines", "Built pipelines")).toBe("Engineered pipelines");
    expect(matchSourceTense("Own the reporting stack", "Own the reporting stack")).toBe("Own the reporting stack");
    expect(matchSourceTense("Leading a team of 4", "Led a team of 4")).toBe("Leading a team of 4");
  });
  it("conjugates common verbs", () => {
    expect(toPast("Plan")).toBe("Planned");
    expect(toPast("Identify")).toBe("Identified");
    expect(toPast("Lead")).toBe("Led");
  });
});
