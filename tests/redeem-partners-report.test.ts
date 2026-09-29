import { describe, expect, it } from "vitest";

import { cleanRedeemCode } from "@/lib/redeem-cookie";
import { isEmail, parsePartnerKey, partnerKey, partnerLink, partnerSlug, partnerSource } from "@/lib/partners-core";
import { seatReportText } from "@/lib/payments/seat-report-core";
import { attributionFromRequest } from "@/lib/attribution-core";

describe("a code kept through sign-up", () => {
  it("keeps only something shaped like a code", () => {
    expect(cleanRedeemCode(" team-abcd 2345 ")).toBe("TEAM-ABCD2345");
    expect(cleanRedeemCode("GIFT-ABCD2345")).toBe("GIFT-ABCD2345");
    expect(cleanRedeemCode("<script>")).toBeNull();
    expect(cleanRedeemCode("")).toBeNull();
    expect(cleanRedeemCode("A".repeat(41))).toBeNull();
  });
});

describe("partners", () => {
  it("makes a clean slug and a link the attribution cookie will credit", () => {
    expect(partnerSlug("Jane Smith Coaching!")).toBe("jane-smith-coaching");
    expect(partnerSlug("   ")).toBe("partner");
    const link = partnerLink("https://work-ly.in/", "jane-smith");
    expect(link).toBe("https://work-ly.in/?ref=partner-jane-smith");
    const a = attributionFromRequest(new URL(link), null, new Date("2026-10-01T00:00:00Z"));
    expect(a.s).toBe(partnerSource("jane-smith"));
  });

  it("stores and reads back the partner", () => {
    const key = partnerKey("jane-smith", " Jane@Example.com ");
    expect(parsePartnerKey(key)).toEqual({ slug: "jane-smith", email: "jane@example.com" });
    expect(parsePartnerKey("partner-jane")).toBeNull();
  });

  it("checks emails loosely but refuses nonsense", () => {
    expect(isEmail("jane@example.com")).toBe(true);
    expect(isEmail("jane@example")).toBe(false);
    expect(isEmail("not an email")).toBe(false);
  });
});

describe("cohort usage report", () => {
  it("gives totals only, ready to paste", () => {
    const text = seatReportText(
      { group: "TEAM-ABCD2345", seats: 25, seatsUsed: 18, activeLast14Days: 11, checksRun: 140, resumesTailored: 37, proToolsUsed: 96 },
      "Acme Bootcamp",
      new Date("2026-11-20T10:00:00Z"),
    );
    expect(text).toContain("Work-ly usage report for Acme Bootcamp, as of 20 November 2026");
    expect(text).toContain("Seats in use: 18 of 25 (72%)");
    expect(text).toContain("Resumes tailored to a posting: 37");
    expect(text).toContain("private to them");
  });
});
