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

import { safeRewrite } from "@/lib/resume/tense";

describe("safeRewrite", () => {
  const src = "Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.";
  it("never conjugates a tool name", () => {
    expect(matchSourceTense("BigQuery and dbt models power dashboards", src)).toBe("BigQuery and dbt models power dashboards");
    expect(matchSourceTense("Tableau dashboards for 3 clients", "Delivered Tableau dashboards for 3 clients")).toBe("Tableau dashboards for 3 clients");
  });
  it("rejects 'Keyword: rest' fragments", () => {
    expect(safeRewrite("Bigqueried and dbted: built 40+ models that power dashboards used by 120 city managers.", src)).toBe(src);
  });
  it("rejects rewrites that drop a named tool", () => {
    const s = "Delivered Power BI and Tableau dashboards for 3 retail and banking clients.";
    expect(safeRewrite("Delivered Power BI and for 3 retail and banking clients.", s)).toBe(s);
    const s2 = "Cut the weekly reporting run from 6 hours to 25 minutes by moving Excel workflows to scheduled SQL and Looker.";
    expect(safeRewrite("Cut the weekly reporting run from 6 hours to 25 minutes by moving Excel workflows to scheduled pipelines.", s2)).toBe(s2);
  });
  it("keeps a real rewrite and fixes its tense", () => {
    expect(
      safeRewrite("Design 40+ dbt data models on BigQuery behind the delivery-ops dashboards 120 city managers use.", src),
    ).toBe("Designed 40+ dbt data models on BigQuery behind the delivery-ops dashboards 120 city managers use.");
  });
});
