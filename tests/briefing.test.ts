import { describe, expect, it } from "vitest";

import { buildBriefing, plural, relativeTime } from "@/lib/guidance/briefing";
import { listMoves, pickNextMove, type NextMoveInput } from "@/lib/guidance/next-move";
import type { DiscoveredJob, DiscoveryRun } from "@/lib/db/types";

const NOW = new Date("2026-09-25T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function job(over: Partial<DiscoveredJob>): DiscoveredJob {
  return {
    id: "j",
    title: "Data Analyst",
    company: "Acme",
    recommendation: "APPLY",
    fitScore: 70,
    fitCoverage: 0.9,
    matchReasons: [],
    discoveredAt: new Date(NOW.getTime() - 10 * DAY),
    isDismissed: false,
    duplicateOfId: null,
    convertedOpportunityId: null,
    ...over,
  } as DiscoveredJob;
}

const run = { status: "COMPLETED", startedAt: new Date(NOW.getTime() - 6 * 3600_000), completedAt: new Date(NOW.getTime() - 6 * 3600_000 + 60_000) } as DiscoveryRun;

const baseInput: NextMoveInput = {
  hasProfile: true,
  discoveredCount: 5,
  topDiscovered: null,
  topOpportunity: null,
  trackedCount: 1,
  applications: [],
  hasDreamJob: true,
  hasPathway: true,
  pathwayNext: null,
  now: NOW,
};

function app(id: string, status: NextMoveInput["applications"][number]["status"], daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * DAY);
  return { id, status, roleTitle: "Analyst", company: id, opportunityId: null, dateApplied: d, reachedAssessmentAt: null, reachedInterviewAt: status === "INTERVIEW" ? d : null, reachedOfferAt: null, updatedAt: d };
}

describe("listMoves", () => {
  it("puts every live application's move in urgency order, and pickNextMove is the first", () => {
    const input = { ...baseInput, applications: [app("Quiet", "APPLIED", 12), app("Inter", "INTERVIEW", 1), app("Offer", "OFFER", 2)] };
    const moves = listMoves(input);
    expect(moves.map((m) => m.id).slice(0, 3)).toEqual(["counter-offer", "mock-interview", "follow-up"]);
    expect(pickNextMove(input)).toEqual(moves[0]);
  });
});

describe("buildBriefing", () => {
  it("counts only what the last check brought in", () => {
    const jobs = [
      job({ id: "old" }),
      job({ id: "new1", discoveredAt: new Date(NOW.getTime() - 3600_000), matchReasons: [{ kind: "screen", text: "Strong SQL match" }] }),
      job({ id: "new2", discoveredAt: new Date(NOW.getTime() - 3600_000), recommendation: "STRETCH" }),
    ];
    const b = buildBriefing({ moves: [], jobs, latestRun: run, applications: [], now: NOW });
    expect(b.lastCheck).toMatchObject({ newListings: 2, readInFull: 1, strongNew: 1 });
  });

  it("ranks Apply now first, then read-in-full, and hides a fit number it can't back", () => {
    const jobs = [
      job({ id: "strong", fitScore: 90 }),
      job({ id: "read", fitScore: 60, matchReasons: [{ kind: "screen", text: "Checked" }] }),
      job({ id: "now", recommendation: "APPLY_NOW", fitScore: 75, fitCoverage: 0.1 }),
      job({ id: "dismissed", recommendation: "APPLY_NOW", isDismissed: true }),
    ];
    const b = buildBriefing({ moves: [], jobs, latestRun: null, applications: [], now: NOW });
    expect(b.matches.map((m) => m.id)).toEqual(["now", "read", "strong"]);
    expect(b.matches[0].fitScore).toBeNull();
    expect(b.matches[0].href).toBe("/discover#job-now");
  });

  it("drops the 'look for new matches' filler when there is real work", () => {
    const moves = listMoves({ ...baseInput, applications: [app("Offer", "OFFER", 1)] });
    const b = buildBriefing({ moves, jobs: [], latestRun: null, applications: [], now: NOW });
    expect(b.moves.map((m) => m.id)).not.toContain("discover-more");
    expect(b.moves.length).toBeLessThanOrEqual(3);
  });

  it("shows no interview rate until three applications were sent", () => {
    const apps = [
      { status: "APPLIED" as const, dateApplied: NOW, createdAt: NOW, reachedInterviewAt: null },
      { status: "INTERVIEW" as const, dateApplied: NOW, createdAt: NOW, reachedInterviewAt: NOW },
    ];
    expect(buildBriefing({ moves: [], jobs: [], latestRun: null, applications: apps, now: NOW }).interviewRate).toBeNull();
    const three = [...apps, { status: "APPLIED" as const, dateApplied: NOW, createdAt: NOW, reachedInterviewAt: null }];
    expect(buildBriefing({ moves: [], jobs: [], latestRun: null, applications: three, now: NOW }).interviewRate).toBe(33);
  });
});

describe("relativeTime", () => {
  it("reads naturally", () => {
    expect(relativeTime(new Date(NOW.getTime() - 6 * 3600_000), NOW.getTime())).toBe("6 hours ago");
    expect(relativeTime(new Date(NOW.getTime() - 30 * 3600_000), NOW.getTime())).toBe("yesterday");
  });
});

describe("plural", () => {
  it("spells matches and listings right", () => {
    expect(plural(2, "strong match")).toBe("2 strong matches");
    expect(plural(1, "strong match")).toBe("1 strong match");
    expect(plural(14, "new listing")).toBe("14 new listings");
  });
});
