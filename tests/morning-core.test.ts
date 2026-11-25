import { describe, expect, it } from "vitest";

import {
  currentMorning,
  homeGreeting,
  postingUrl,
  mergeMorning,
  pickMorningCandidates,
  preparedLabel,
  reasonFrom,
  type MorningCandidate,
  type MorningItem,
} from "@/lib/morning/morning-core";

const NOW = new Date("2026-11-24T06:00:00Z");
const DESC = "Own the analytics for a delivery business. ".repeat(10);

function row(over: Partial<MorningCandidate>): MorningCandidate {
  return {
    id: "d1",
    title: "Senior Data Analyst",
    company: "Freshcart",
    fitScore: 82,
    fitCoverage: 0.8,
    recommendation: "APPLY",
    matchReasons: [{ kind: "screen", text: "Your dbt work matches their pipeline." }],
    description: DESC,
    discoveredAt: new Date("2026-11-23T22:00:00Z"),
    ...over,
  } as MorningCandidate;
}

function item(id: string): MorningItem {
  return { opportunityId: id, title: "Analyst", company: null, fitScore: 80, reason: null, kinds: ["resume"] };
}

describe("pickMorningCandidates", () => {
  it("keeps only recent, well-fitting apply listings with a real description", () => {
    const rows = [
      row({ id: "ok" }),
      row({ id: "stretch", recommendation: "STRETCH" }),
      row({ id: "low", fitScore: 60 }),
      row({ id: "thin", fitCoverage: 0.2 }),
      row({ id: "stub", description: "Short." }),
      row({ id: "old", discoveredAt: new Date("2026-11-15T00:00:00Z") }),
    ];
    expect(pickMorningCandidates(rows, { now: NOW }).map((r) => r.id)).toEqual(["ok"]);
  });

  it("puts listings read in full ahead of rules-only ones, then best fit first", () => {
    const rows = [
      row({ id: "rules-90", fitScore: 90, matchReasons: [{ kind: "skill", text: "SQL" }] as MorningCandidate["matchReasons"] }),
      row({ id: "read-75", fitScore: 75 }),
      row({ id: "read-85", fitScore: 85 }),
    ];
    expect(pickMorningCandidates(rows, { now: NOW }).map((r) => r.id)).toEqual(["read-85", "read-75", "rules-90"]);
  });

  it("stops at the nightly limit", () => {
    const rows = Array.from({ length: 6 }, (_, i) => row({ id: `j${i}`, fitScore: 70 + i }));
    expect(pickMorningCandidates(rows, { now: NOW })).toHaveLength(3);
  });

  it("treats an unknown coverage as usable", () => {
    expect(pickMorningCandidates([row({ fitCoverage: null })], { now: NOW })).toHaveLength(1);
  });
});

describe("reasonFrom", () => {
  it("prefers the full read's own line", () => {
    expect(reasonFrom([{ kind: "skill", text: "SQL" }, { kind: "screen", text: "Strong on dbt." }] as never)).toBe("Strong on dbt.");
    expect(reasonFrom(null)).toBeNull();
  });
});

describe("the morning list over several nights", () => {
  it("shows a list for a few days, then lets it go", () => {
    const file = { v: 1 as const, preparedAt: "2026-11-23T23:30:00Z", items: [item("a")] };
    expect(currentMorning(file, NOW)?.items).toHaveLength(1);
    expect(currentMorning(file, new Date("2026-11-29T00:00:00Z"))).toBeNull();
  });

  it("puts tonight's jobs first and never lists a job twice", () => {
    const before = { v: 1 as const, preparedAt: "2026-11-23T00:00:00Z", items: [item("a"), item("b")] };
    const merged = mergeMorning(before, [item("c"), item("a")], NOW);
    expect(merged.items.map((i) => i.opportunityId)).toEqual(["c", "a", "b"]);
    expect(merged.preparedAt).toBe(NOW.toISOString());
  });

  it("keeps the old date when a night writes nothing, so the list still ages out", () => {
    const before = { v: 1 as const, preparedAt: "2026-11-22T00:00:00Z", items: [item("a")] };
    expect(mergeMorning(before, [], NOW).preparedAt).toBe("2026-11-22T00:00:00.000Z");
  });

  it("says when it was written", () => {
    expect(preparedLabel("2026-11-24T00:00:00Z", NOW)).toBe("Written overnight");
    expect(preparedLabel("2026-11-23T00:00:00Z", NOW)).toBe("Written yesterday");
    expect(preparedLabel("2026-11-20T00:00:00Z", NOW)).toBe("Written on 20 Nov");
  });
});

describe("homeGreeting", () => {
  const check = { when: "6 hours ago", newListings: 12, strongNew: 3 };
  it("leads with what's ready to send", () => {
    expect(homeGreeting({ isPro: true, ready: 2, waiting: 2, lastCheck: check })).toBe("I've got 2 applications ready for you. They're just below.");
    expect(homeGreeting({ isPro: true, ready: 2, waiting: 1, lastCheck: check })).toBe("I've got an application ready for you. It's just below.");
  });
  it("notices when everything has been sent", () => {
    expect(homeGreeting({ isPro: true, ready: 2, waiting: 0, lastCheck: check })).toBe("You've sent everything I wrote. I'll look for more tonight.");
  });
  it("falls back to what the last search found", () => {
    expect(homeGreeting({ isPro: true, ready: 0, waiting: 0, lastCheck: check })).toBe("I checked 6 hours ago and found 12 new listings, 3 strong matches. I'll look again tonight.");
    expect(homeGreeting({ isPro: false, ready: 0, waiting: 0, lastCheck: { when: "yesterday", newListings: 1, strongNew: 0 } })).toBe("I checked yesterday and found 1 new listing.");
    expect(homeGreeting({ isPro: false, ready: 0, waiting: 0, lastCheck: { when: "yesterday", newListings: 0, strongNew: 0 } })).toBe("I checked yesterday and found nothing new.");
  });
  it("says what happens next before there's anything", () => {
    expect(homeGreeting({ isPro: true, ready: 0, waiting: 0, lastCheck: null })).toBe("I'll run your first nightly check tonight.");
    expect(homeGreeting({ isPro: false, ready: 0, waiting: 0, lastCheck: null })).toBe("Let's find your first matches.");
  });
});

describe("postingUrl", () => {
  it("only offers web links", () => {
    expect(postingUrl("https://jobs.lever.co/acme/1")).toBe("https://jobs.lever.co/acme/1");
    expect(postingUrl("javascript:alert(1)")).toBeNull();
    expect(postingUrl("not a url")).toBeNull();
    expect(postingUrl(null)).toBeNull();
  });
});
