import { describe, expect, it } from "vitest";

import { backfillRoleDates, findRange, toIsoish } from "@/lib/career/date-backfill";

const text = `EXPERIENCE
Data Analyst | QuickBite (food delivery app) | Mar 2023 - Present
- Built 40+ dbt models
Business Analyst | Northwind Consulting | Jul 2021 - Feb 2023
- Delivered dashboards
Analyst Intern
Acme Corp
06/2020 – 12/2020`;

describe("role dates read back from the resume", () => {
  it("reads common date formats without adding months", () => {
    expect(toIsoish("Mar 2023")).toBe("2023-03");
    expect(toIsoish("Sept. 2020")).toBe("2020-09");
    expect(toIsoish("06/2020")).toBe("2020-06");
    expect(toIsoish("2021")).toBe("2021");
    expect(toIsoish("Present")).toBeNull();
  });

  it("finds a current role and a closed role, on the same or the next line", () => {
    expect(findRange(text, { company: "QuickBite (food delivery app)", title: "Data Analyst" })).toEqual({ start: "2023-03", end: null, current: true });
    expect(findRange(text, { company: "Northwind Consulting", title: "Business Analyst" })).toEqual({ start: "2021-07", end: "2023-02", current: false });
    expect(findRange(text, { company: "Acme Corp", title: "Analyst Intern" })).toEqual({ start: "2020-06", end: "2020-12", current: false });
  });

  it("fills only what's missing and never overrides the parser", () => {
    const out = backfillRoleDates(
      [
        { company: "QuickBite (food delivery app)", title: "Data Analyst", startDate: "2023-03" },
        { company: "Northwind Consulting", title: "Business Analyst" },
        { company: "Elsewhere Ltd", title: "Engineer", startDate: "2019", endDate: "2020" },
        { company: "Not In Text", title: "Ghost role" },
      ],
      text,
    );
    expect(out[0]).toMatchObject({ startDate: "2023-03", endDate: undefined, isCurrent: true });
    expect(out[1]).toMatchObject({ startDate: "2021-07", endDate: "2023-02", isCurrent: false });
    expect(out[2]).toMatchObject({ startDate: "2019", endDate: "2020" });
    expect(out[3]).toEqual({ company: "Not In Text", title: "Ghost role" });
  });
});
