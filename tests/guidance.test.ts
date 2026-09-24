import { describe, expect, it } from "vitest";

import { pickNextMove, type NextMoveApplication, type NextMoveInput } from "@/lib/guidance/next-move";
import { stageMomentFor, type StageChange } from "@/lib/guidance/stage-moments";
import { TOOLS, toolAvailableFor } from "@/lib/guidance/tools";
import { buildPreviewData } from "@/lib/guidance/preview-data";

const NOW = new Date("2026-09-24T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function app(overrides: Partial<NextMoveApplication>): NextMoveApplication {
  return {
    id: "a1",
    status: "APPLIED",
    roleTitle: "Senior Data Analyst",
    company: "Hevo Data",
    opportunityId: "o1",
    dateApplied: daysAgo(1),
    reachedAssessmentAt: null,
    reachedInterviewAt: null,
    reachedOfferAt: null,
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

function input(overrides: Partial<NextMoveInput> = {}): NextMoveInput {
  return {
    hasProfile: true,
    discoveredCount: 10,
    topDiscovered: { title: "Analytics Engineer", company: "Razorpay", fitScore: 82 },
    topOpportunity: null,
    trackedCount: 1,
    applications: [],
    hasDreamJob: true,
    hasPathway: true,
    pathwayNext: null,
    now: NOW,
    ...overrides,
  };
}

describe("pickNextMove", () => {
  it("asks for a resume before anything else", () => {
    const move = pickNextMove(input({ hasProfile: false, applications: [app({ status: "OFFER" })] }));
    expect(move.id).toBe("upload-resume");
  });

  it("puts a live offer ahead of an interview", () => {
    const move = pickNextMove(
      input({ applications: [app({ id: "i", status: "INTERVIEW" }), app({ id: "o", status: "OFFER", company: "Zeta" })] }),
    );
    expect(move.id).toBe("counter-offer");
    expect(move.cta.href).toBe("/applications/o#tool-counter-offer");
    expect(move.title).toContain("Zeta");
  });

  it("sends an interview to the mock interview", () => {
    const move = pickNextMove(input({ applications: [app({ status: "FINAL_INTERVIEW" })] }));
    expect(move.id).toBe("mock-interview");
    expect(move.reason).toMatch(/final/i);
    expect(move.cta.href).toBe("/applications/a1#tool-mock-interview");
  });

  it("suggests a follow-up only after a quiet week", () => {
    expect(pickNextMove(input({ applications: [app({ dateApplied: daysAgo(3), updatedAt: daysAgo(3) })] })).id).not.toBe(
      "follow-up",
    );
    const move = pickNextMove(input({ applications: [app({ dateApplied: daysAgo(9), updatedAt: daysAgo(9) })] }));
    expect(move.id).toBe("follow-up");
    expect(move.reason).toBe("No reply in 9 days");
  });

  it("offers tailoring for an application being prepared", () => {
    const move = pickNextMove(input({ applications: [app({ status: "PREPARING", dateApplied: null })] }));
    expect(move.id).toBe("tailor");
    expect(move.cta.href).toBe("/opportunities/o1/resume");
  });

  it("falls back to the application page when a prepared role has no analysed job", () => {
    const move = pickNextMove(input({ applications: [app({ status: "PREPARING", opportunityId: null, dateApplied: null })] }));
    expect(move.cta.href).toBe("/applications/a1#tool-resume-bullets");
  });

  it("points a new user with matches at their best one, showing Candidate Fit", () => {
    const move = pickNextMove(input({ trackedCount: 0 }));
    expect(move.id).toBe("review-matches");
    expect(move.title).toBe("Analytics Engineer at Razorpay: Candidate Fit is 82/100");
  });

  it("never shows a withheld fit score", () => {
    const move = pickNextMove(input({ trackedCount: 0, topDiscovered: { title: "Analyst", company: null, fitScore: null } }));
    expect(move.title).toBe("Analyst");
  });

  it("walks the career-change path when the pipeline is quiet", () => {
    expect(pickNextMove(input({ discoveredCount: 0 })).id).toBe("discover");
    expect(pickNextMove(input({ hasDreamJob: false })).id).toBe("dream-job");
    expect(pickNextMove(input({ hasPathway: false })).id).toBe("pathway");
    expect(pickNextMove(input({ pathwayNext: "Finish the dbt course" })).title).toBe("Finish the dbt course");
    expect(pickNextMove(input()).id).toBe("discover-more");
  });
});

const change = (overrides: Partial<StageChange>): StageChange => ({
  applicationId: "a1",
  opportunityId: "o1",
  roleTitle: "Senior Data Analyst",
  company: "Hevo Data",
  from: "APPLIED",
  to: "INTERVIEW",
  ...overrides,
});

describe("stageMomentFor", () => {
  it("celebrates an interview and offers the prep tools", () => {
    const moment = stageMomentFor(change({}));
    expect(moment?.title).toBe("You got an interview at Hevo Data!");
    expect(moment?.actions.map((a) => a.toolId)).toEqual(["mock-interview", "interview-questions", "practice-task"]);
    expect(moment?.actions[0].href).toBe("/applications/a1#tool-mock-interview");
    expect(moment?.actions[1].href).toBe("/opportunities/o1");
  });

  it("drops job-page tools for a manually logged application", () => {
    const moment = stageMomentFor(change({ opportunityId: null }));
    expect(moment?.actions.map((a) => a.toolId)).toEqual(["mock-interview", "practice-task"]);
  });

  it("says nothing when moving backwards or not moving", () => {
    expect(stageMomentFor(change({ from: "INTERVIEW", to: "APPLIED" }))).toBeNull();
    expect(stageMomentFor(change({ from: "INTERVIEW", to: "INTERVIEW" }))).toBeNull();
    expect(stageMomentFor(change({ from: "APPLIED", to: "WITHDRAWN" }))).toBeNull();
  });

  it("offers negotiation and accepting for an offer", () => {
    const moment = stageMomentFor(change({ from: "FINAL_INTERVIEW", to: "OFFER" }));
    expect(moment?.actions.map((a) => a.toolId)).toEqual(["counter-offer", "accept-offer"]);
  });

  it("is gentle about a rejection", () => {
    const moment = stageMomentFor(change({ from: "INTERVIEW", to: "REJECTED" }));
    expect(moment?.tone).toBe("console");
    expect(moment?.actions[0].href).toBe("/discover");
  });

  it("treats a first status from a job page as moving forward", () => {
    const moment = stageMomentFor(change({ from: null, to: "APPLIED" }));
    expect(moment?.title).toBe("Application sent at Hevo Data");
  });
});

describe("toolAvailableFor", () => {
  const base = { reachedAssessmentAt: null, reachedInterviewAt: null };
  it("keeps offer tools to live offers", () => {
    expect(toolAvailableFor(TOOLS["counter-offer"], { ...base, status: "OFFER" })).toBe(true);
    expect(toolAvailableFor(TOOLS["counter-offer"], { ...base, status: "REJECTED" })).toBe(false);
  });
  it("keeps interview practice open after the interview was reached", () => {
    expect(toolAvailableFor(TOOLS["mock-interview"], { ...base, status: "APPLIED" })).toBe(false);
    expect(toolAvailableFor(TOOLS["mock-interview"], { status: "REJECTED", reachedAssessmentAt: null, reachedInterviewAt: NOW })).toBe(true);
  });
  it("opens the practice task at the assessment", () => {
    expect(toolAvailableFor(TOOLS["practice-task"], { ...base, status: "ASSESSMENT" })).toBe(true);
  });
});

describe("buildPreviewData", () => {
  it("copies real inputs only, deduplicated and capped", () => {
    const data = buildPreviewData({
      requiredSkills: ["SQL", "dbt", "sql", "Looker"],
      preferredSkills: ["Python"],
      strengths: ["Strong SQL"],
      gaps: [{ type: "SKILL", title: "No Airflow experience", description: "" } as never],
      experiences: [
        { title: "Analyst", company: "Old Co", description: null, isCurrent: false, startDate: new Date("2019-01-01") },
        {
          title: "Senior Analyst",
          company: "Swiggy",
          description: "- Built 40+ dashboards for ops teams\n- Cut report time from 6h to 25min",
          isCurrent: true,
          startDate: new Date("2022-01-01"),
        },
      ],
    });
    expect(data.keywords).toEqual(["SQL", "dbt", "Looker", "Python"]);
    expect(data.gaps).toEqual(["No Airflow experience"]);
    expect(data.latestRole).toBe("Senior Analyst at Swiggy");
    expect(data.latestRoleLines).toBe(2);
    expect(data.roleCount).toBe(2);
  });

  it("copes with nothing to go on", () => {
    const data = buildPreviewData({});
    expect(data).toEqual({ keywords: [], strengths: [], gaps: [], latestRole: null, latestRoleLines: 0, roleCount: 0 });
  });
});
