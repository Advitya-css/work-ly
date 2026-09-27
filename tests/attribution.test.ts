import { describe, expect, it } from "vitest";

import {
  attributionFromRequest,
  buildFunnelReport,
  decodeAttribution,
  encodeAttribution,
  shouldStore,
} from "@/lib/attribution-core";

const NOW = new Date("2026-09-27T12:00:00Z");

describe("attributionFromRequest", () => {
  it("reads utm tags first", () => {
    const a = attributionFromRequest(
      new URL("https://www.work-ly.in/free-grader?utm_source=Reddit&utm_medium=comment&utm_campaign=r/jobsearchhacks oct"),
      "https://www.reddit.com/r/jobsearchhacks/",
      NOW,
    );
    expect(a).toMatchObject({ s: "reddit", m: "comment", c: "r-jobsearchhacks-oct", l: "/free-grader", t: "2026-09-27" });
  });

  it("falls back to the referring site, grouped into channels", () => {
    expect(attributionFromRequest(new URL("https://www.work-ly.in/"), "https://old.reddit.com/r/resumes", NOW).s).toBe("reddit");
    expect(attributionFromRequest(new URL("https://www.work-ly.in/"), "https://www.google.co.uk/", NOW).s).toBe("google");
    expect(attributionFromRequest(new URL("https://www.work-ly.in/"), "https://www.producthunt.com/posts/x", NOW).s).toBe("producthunt");
  });

  it("treats own-site and missing referrers as direct", () => {
    expect(attributionFromRequest(new URL("https://www.work-ly.in/pricing"), "https://www.work-ly.in/", NOW).s).toBe("direct");
    expect(attributionFromRequest(new URL("https://www.work-ly.in/pricing"), null, NOW).s).toBe("direct");
  });
});

describe("first touch", () => {
  const direct = attributionFromRequest(new URL("https://www.work-ly.in/"), null, NOW);
  const reddit = attributionFromRequest(new URL("https://www.work-ly.in/?utm_source=reddit"), null, NOW);
  it("keeps the first real source, but lets a real source replace direct", () => {
    expect(shouldStore(null, direct)).toBe(true);
    expect(shouldStore(direct, reddit)).toBe(true);
    expect(shouldStore(reddit, direct)).toBe(false);
    expect(shouldStore(reddit, { ...reddit, s: "google" })).toBe(false);
  });
  it("round-trips through the cookie and rejects junk", () => {
    expect(decodeAttribution(encodeAttribution(reddit))).toEqual(reddit);
    expect(decodeAttribution("not-json")).toBeNull();
  });
});

describe("buildFunnelReport", () => {
  it("ranks channels by revenue and counts the last 7 days", () => {
    const rows = [
      { key: "funnel:grader:2026-09-20:reddit:none", count: 40 },
      { key: "funnel:signup:2026-09-20:reddit:none:u1", count: 1 },
      { key: "funnel:signup:2026-09-21:reddit:none:u2", count: 1 },
      { key: "funnel:checkout:2026-09-21:reddit:none", count: 2 },
      { key: "funnel:paywall:2026-09-21:reddit:none", count: 5 },
      { key: "funnel:paid:2026-09-25:reddit:none:o1", count: 4999 },
      { key: "funnel:grader:2026-09-22:producthunt:launch", count: 300 },
      { key: "funnel:signup:2026-09-22:producthunt:launch:u3", count: 1 },
      { key: "funnel:paid:2026-08-01:reddit:none:old", count: 1999 },
    ];
    const r = buildFunnelReport(rows, 30, NOW);
    expect(r.rows[0]).toMatchObject({ channel: "reddit", checks: 40, signups: 2, offers: 5, checkouts: 2, paid: 1, revenueCents: 4999 });
    expect(r.rows[1]).toMatchObject({ channel: "producthunt / launch", checks: 300, paid: 0 });
    expect(r.paidLast7).toBe(1);
    expect(r.totals.revenueCents).toBe(4999);
  });
});
