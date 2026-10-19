import { describe, expect, it } from "vitest";

import { formatDateRange, formatMonthYear } from "../src/lib/format";
import { resumeDateRange } from "../src/lib/resume/tailored-resume-core";

describe("profile dates", () => {
  it("reads stored dates in UTC, so 1 March never shows as February", () => {
    expect(formatMonthYear(new Date("2023-03-01T00:00:00Z"))).toBe("Mar 2023");
  });
  it("shows a year-only date as just the year", () => {
    expect(formatMonthYear(new Date("2019-01-01T00:00:00Z"))).toBe("2019");
    expect(formatDateRange(new Date("2015-01-01T00:00:00Z"), new Date("2019-01-01T00:00:00Z"))).toBe("2015 – 2019");
    expect(resumeDateRange(new Date("2017-07-01T00:00:00Z"), new Date("2021-01-01T00:00:00Z"), false)).toBe("Jul 2017 – 2021");
  });
});
