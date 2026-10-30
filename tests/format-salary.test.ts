import { describe, expect, it } from "vitest";

import { formatSalaryRange } from "@/lib/format";

describe("formatSalaryRange", () => {
  it("reads small rupee figures as lakhs a year (28-38 LPA)", () => {
    expect(formatSalaryRange(28, 38, "INR")).toBe("₹28L – ₹38L/yr");
    expect(formatSalaryRange(12, null, "INR")).toBe("₹12L/yr");
  });

  it("keeps full rupee amounts as they were", () => {
    expect(formatSalaryRange(2800000, 3800000, "INR")).toBe("₹28L – ₹38L/yr");
    expect(formatSalaryRange(40000, 60000, "INR")).toBe("₹40,000 – ₹60,000/mo");
    expect(formatSalaryRange(500, 800, "INR")).toBe("₹500 – ₹800/hr");
  });

  it("leaves other currencies alone", () => {
    expect(formatSalaryRange(40, 60, "USD")).toBe("USD 40 – 60/hr");
    expect(formatSalaryRange(90000, 120000, "USD")).toBe("USD 90,000 – 120,000/yr");
  });
});
