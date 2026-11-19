import { describe, expect, it } from "vitest";

import { unsupportedNumbers } from "@/lib/ai/career-context";

/**
 * THE CHECK BEHIND "WORK-LY NEVER INVENTS A FIGURE".
 *
 * Every resume carries dates, and the old substring check asked only
 * whether a generated number's digits appeared anywhere in the candidate's
 * text. "Jan 2015" contains 1, 5, 15, 20, 201 and 2015, so most small
 * invented numbers read as supported. These are the cases that used to
 * pass.
 */
const RESUME = `Priya Sharma
Data Analyst, Zeta, Jan 2015 - Mar 2019
- Built dashboards used by the ops team
- Ran an A/B test that lifted order conversion 3.2%
- Owned reporting for 120 city managers
Education: B.Tech, 2014`;

describe("unsupportedNumbers", () => {
  it("catches an invented number whose digits hide inside a date", () => {
    expect(unsupportedNumbers("Led a team of 5 engineers", RESUME)).toContain("5");
    expect(unsupportedNumbers("Managed a budget of 19 lakh", RESUME)).toContain("19");
    expect(unsupportedNumbers("Shipped 201 models", RESUME)).toContain("201");
  });

  it("catches an invented percentage", () => {
    expect(unsupportedNumbers("Cut reporting time by 40%", RESUME)).toEqual(["40%"]);
  });

  it("leaves the candidate's own numbers alone", () => {
    expect(unsupportedNumbers("Worked there from 2015 to 2019", RESUME)).toEqual([]);
    expect(unsupportedNumbers("Reporting for 120 city managers", RESUME)).toEqual([]);
    expect(unsupportedNumbers("Lifted conversion 3.2%", RESUME)).toEqual([]);
    expect(unsupportedNumbers("B.Tech, 2014", RESUME)).toEqual([]);
  });

  it("reads a thousands separator as the same number either way round", () => {
    expect(unsupportedNumbers("Served 1,200 users", "Served 1200 users")).toEqual([]);
    expect(unsupportedNumbers("Served 1200 users", "Served 1,200 users")).toEqual([]);
  });

  it("treats a unit suffix as the same number", () => {
    expect(unsupportedNumbers("in the 90k band", "Salary band 90k to 110k")).toEqual([]);
  });

  it("flags a near miss rather than rounding it in the candidate's favour", () => {
    // 3 is not 3.2. Flagging is the safe direction: callers send the
    // original line back rather than publish a number nobody wrote.
    expect(unsupportedNumbers("conversion up by over 3%", RESUME)).toContain("3%");
  });

  it("finds nothing in a text with no numbers", () => {
    expect(unsupportedNumbers("Built the reporting the ops team runs on", RESUME)).toEqual([]);
  });
});
