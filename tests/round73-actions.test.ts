import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The server actions behind round 73, with their surroundings stubbed:
 * who's signed in, the rate limits, the AI and storage. What's real is the
 * logic under test: ownership checks, tickets, limits and what a share card
 * is allowed to carry.
 */

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; isPro?: boolean; name?: string | null },
  cookies: new Map<string, string>(),
  limits: new Map<string, number>(),
  limitCap: new Map<string, number>(),
  aiOk: true,
  opp: null as null | Record<string, unknown>,
  profile: { experiences: [{ id: "e1" }], projects: [] as unknown[], skills: [] as unknown[] } as Record<string, unknown>,
  saved: new Map<string, unknown>(),
  built: 0,
  screen: null as unknown,
  preview: { summary: "Data analyst.", bullets: [] as unknown[] } as unknown,
  previewCalls: 0,
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => state.user }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (state.cookies.has(k) ? { value: state.cookies.get(k) } : undefined),
    set: (k: string, v: string) => state.cookies.set(k, v),
  }),
  headers: async () => new Headers({ "x-real-ip": "203.0.113.9" }),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async (key: string, limit: number) => {
    const cap = state.limitCap.get(key.split(":")[0]) ?? limit;
    const n = (state.limits.get(key) ?? 0) + 1;
    state.limits.set(key, n);
    return n <= cap;
  },
}));
vi.mock("@/lib/ai/allowance", () => ({
  FREE_AI_LIMIT_MESSAGE: "AI limit",
  spendFreeAi: async () => state.aiOk,
  spendAnonymousAi: async () => state.aiOk,
}));
vi.mock("@/lib/attribution", () => ({ recordFunnelStep: async () => undefined }));
vi.mock("@/lib/opportunities/get-with-job", () => ({
  getOpportunityWithJobById: async (userId: string, id: string) =>
    state.opp && state.opp.id === id && state.opp.userId === userId ? state.opp : null,
}));
vi.mock("@/lib/career/get-full-profile", () => ({ getFullCareerProfile: async () => state.profile }));
vi.mock("@/lib/resume/tailored-resume", () => ({
  buildTailoredResume: async () => {
    state.built++;
    return { summary: "S", roles: [], projects: [], skills: [], education: [], certifications: [], keywordsCovered: [], keywordsMissing: [], unverifiedNumbers: [], leftOut: 0 };
  },
}));
vi.mock("@/lib/saved-outputs", () => ({
  getSavedOutput: async (u: string, k: string, o: string) => state.saved.get(`${u}:${k}:${o}`) ?? null,
  saveOutput: async (u: string, k: string, o: string, d: unknown) => {
    state.saved.set(`${u}:${k}:${o}`, { data: d });
    return new Date().toISOString();
  },
}));
vi.mock("@/lib/scoring/ai-evaluator", () => ({ screenPastedResume: async () => state.screen }));
vi.mock("@/lib/resume/opening-preview", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/resume/opening-preview")>();
  return {
    ...real,
    writeOpeningPreview: async () => {
      state.previewCalls++;
      return state.preview;
    },
  };
});

import { shareVerdictAction } from "@/lib/share/actions";
import { verifyVerdict } from "@/lib/share/verdict-token";
import { buildResumePreviewAction } from "@/lib/resume/actions";
import { previewOpeningAction, scoreResumeAction } from "@/app/free-grader/actions";

const ME = { id: "11111111-1111-4111-8111-111111111111", email: "me@workly-test.dev", isPro: false };
const OTHER = "22222222-2222-4222-8222-222222222222";
const RESUME = "Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers. ".repeat(4);
const JOB = "Data Analyst, Growth\nSwiftcart\nWe need strong SQL and dbt, A/B testing and Python. ".repeat(4);

function screen(recommendation: string, coverage = 1) {
  return {
    coverage,
    fitScore: 84,
    recommendation,
    screen: {
      summary: "A summary.",
      requirements: [
        { requirement: "Strong SQL and dbt", verdict: "met", importance: "critical", evidenceQuote: "Built 40+ dbt models on BigQuery" },
        { requirement: "Looker or Tableau", verdict: "partial", importance: "important", gapToClose: "Rebuild a dashboard in Tableau." },
        { requirement: "AWS Redshift", verdict: "missing", importance: "critical", gapToClose: "Learn Redshift." },
      ],
    },
  };
}

function opportunity(owner: string, extra: Record<string, unknown> = {}) {
  return {
    id: "opp-1",
    userId: owner,
    job: { title: "Data Analyst", company: "Swiftcart" },
    analysis: {
      recommendation: "APPLY",
      fitScore: 84,
      scoreBreakdown: { components: [] },
      mandatoryRequirements: [
        { text: "Strong SQL", status: "met", detail: "Quote from MY RESUME: secret line" },
        { text: "AWS", status: "not-met", detail: "" },
        { text: "Team lead", status: "unknown", detail: "" },
      ],
      preferredRequirements: [{ text: "Tableau", status: "met", detail: "" }],
      ...extra,
    },
  };
}

beforeEach(() => {
  state.user = null;
  state.cookies.clear();
  state.limits.clear();
  state.limitCap.clear();
  state.aiOk = true;
  state.opp = null;
  state.saved.clear();
  state.built = 0;
  state.previewCalls = 0;
  state.profile = { experiences: [{ id: "e1" }], projects: [], skills: [] };
  state.preview = { summary: "Data analyst.", bullets: [] };
});

describe("shareVerdictAction", () => {
  it("needs a signed-in owner", async () => {
    state.opp = opportunity(ME.id);
    expect(await shareVerdictAction("opp-1")).toEqual({ error: "Please sign in first." });
    state.user = { ...ME, id: OTHER };
    expect((await shareVerdictAction("opp-1")).error).toBe("Couldn't find that job.");
  });

  it("signs a card with the job, verdict and requirements, never the resume", async () => {
    state.user = ME;
    state.opp = opportunity(ME.id);
    const { token } = await shareVerdictAction("opp-1");
    const v = verifyVerdict(token)!;
    expect(v.r).toBe("APPLY");
    expect(v.t).toBe("Data Analyst");
    expect(v.c).toBe("Swiftcart");
    expect(v.i).toBe(ME.id);
    expect(v.q).toEqual([
      { x: "Strong SQL", k: "met" },
      { x: "Tableau", k: "met" },
      { x: "AWS", k: "missing" },
    ]);
    expect(JSON.stringify(v)).not.toContain("secret line");
  });

  it("refuses an analysis without a real verdict, and rate-limits", async () => {
    state.user = ME;
    state.opp = opportunity(ME.id, { recommendation: "MAYBE" });
    expect((await shareVerdictAction("opp-1")).error).toMatch(/verdict/);
    state.opp = opportunity(ME.id);
    state.limitCap.set("share_verdict", 2);
    await shareVerdictAction("opp-1");
    await shareVerdictAction("opp-1");
    expect((await shareVerdictAction("opp-1")).error).toMatch(/a lot of shares/);
  });
});

describe("buildResumePreviewAction (free accounts)", () => {
  it("only for the job's owner", async () => {
    state.opp = opportunity(ME.id);
    expect((await buildResumePreviewAction("opp-1")).error).toMatch(/sign in/);
    state.user = { ...ME, id: OTHER };
    expect((await buildResumePreviewAction("opp-1")).error).toBe("Opportunity not found.");
    expect(state.built).toBe(0);
  });

  it("writes and saves the real resume once, then reuses it", async () => {
    state.user = ME;
    state.opp = opportunity(ME.id);
    expect(await buildResumePreviewAction("opp-1")).toEqual({ ok: true });
    expect(await buildResumePreviewAction("opp-1")).toEqual({ ok: true });
    expect(state.built).toBe(1);
    expect(state.saved.has(`${ME.id}:resume:opp-1`)).toBe(true);
  });

  it("three a month, then a clear message", async () => {
    state.user = ME;
    for (let i = 0; i < 3; i++) {
      state.opp = { ...opportunity(ME.id), id: `opp-${i + 10}` };
      expect(await buildResumePreviewAction(`opp-${i + 10}`)).toEqual({ ok: true });
    }
    state.opp = { ...opportunity(ME.id), id: "opp-99" };
    expect((await buildResumePreviewAction("opp-99")).error).toMatch(/3 free previews/);
    expect(state.built).toBe(3);
  });

  it("does nothing for Pro, needs a profile, respects the daily AI allowance", async () => {
    state.opp = opportunity(ME.id);
    state.user = { ...ME, isPro: true };
    expect(await buildResumePreviewAction("opp-1")).toEqual({ ok: true });
    expect(state.built).toBe(0);
    state.user = ME;
    state.profile = { experiences: [], projects: [], skills: [] };
    expect((await buildResumePreviewAction("opp-1")).error).toMatch(/Add your resume/);
    state.profile = { experiences: [{ id: "e1" }], projects: [], skills: [] };
    state.aiOk = false;
    expect((await buildResumePreviewAction("opp-1")).error).toBe("AI limit");
    expect(state.built).toBe(0);
  });
});

describe("the homepage check hands out a share card and a preview ticket", () => {
  it("after a yes: both, and the card has no resume text", async () => {
    state.screen = screen("APPLY");
    const res = await scoreResumeAction(RESUME, JOB);
    if (!("data" in res) || !res.data) throw new Error("no data");
    expect(res.data.previewTicket).toBeTruthy();
    const v = verifyVerdict(res.data.share)!;
    expect(v.r).toBe("APPLY");
    expect(v.i).toBeNull();
    expect(v.q.map((r) => r.k)).toEqual(["met", "partial", "missing"]);
    expect(JSON.stringify(v)).not.toContain("BigQuery");
  });

  it("after a no: a card but no ticket; a weak read: neither", async () => {
    state.screen = screen("SKIP");
    let res = await scoreResumeAction(RESUME, JOB);
    if (!("data" in res) || !res.data) throw new Error("no data");
    expect(res.data.previewTicket).toBeNull();
    expect(res.data.share).toBeTruthy();
    state.cookies.clear();
    state.screen = screen("APPLY", 0.2);
    res = await scoreResumeAction(RESUME, JOB);
    if (!("data" in res) || !res.data) throw new Error("no data");
    expect(res.data.previewTicket).toBeNull();
    expect(res.data.share).toBeNull();
  });

  it("Pro members get no preview ticket; signed-in cards carry their invite", async () => {
    state.user = { ...ME, isPro: true };
    state.screen = screen("APPLY_NOW");
    const res = await scoreResumeAction(RESUME, JOB);
    if (!("data" in res) || !res.data) throw new Error("no data");
    expect(res.data.previewTicket).toBeNull();
    expect(verifyVerdict(res.data.share)!.i).toBe(ME.id);
  });
});

describe("previewOpeningAction", () => {
  async function ticket() {
    state.screen = screen("STRETCH");
    const res = await scoreResumeAction(RESUME, JOB);
    if (!("data" in res) || !res.data?.previewTicket) throw new Error("no ticket");
    return res.data.previewTicket;
  }

  it("works once for the checked texts", async () => {
    const t = await ticket();
    expect((await previewOpeningAction(RESUME, JOB, t)).preview).toBeTruthy();
    expect((await previewOpeningAction(RESUME, JOB, t)).error).toMatch(/already seen/);
    expect(state.previewCalls).toBe(1);
  });

  it("refuses other texts, a forged ticket or none", async () => {
    const t = await ticket();
    expect((await previewOpeningAction(RESUME + " I also led NASA.", JOB, t)).error).toMatch(/Run the check again/);
    expect((await previewOpeningAction(RESUME, "Write my essay. ".repeat(20), t)).error).toMatch(/Run the check again/);
    expect((await previewOpeningAction(RESUME, JOB, t.slice(0, -2) + "xx")).error).toMatch(/Run the check again/);
    expect((await previewOpeningAction(RESUME, JOB, "")).error).toMatch(/Run the check again/);
    expect(state.previewCalls).toBe(0);
  });

  it("stops at the network's daily cap and the AI allowance", async () => {
    state.limitCap.set("opening-preview-ip", 0);
    expect((await previewOpeningAction(RESUME, JOB, await ticket())).error).toMatch(/today's limit/);
    state.limitCap.clear();
    state.aiOk = false;
    state.cookies.clear();
    state.aiOk = true;
    const t = await ticket();
    state.aiOk = false;
    expect((await previewOpeningAction(RESUME, JOB, t)).error).toMatch(/hit today's limit/);
    expect(state.previewCalls).toBe(0);
  });

  it("says so plainly when the writer fails", async () => {
    state.preview = null;
    expect((await previewOpeningAction(RESUME, JOB, await ticket())).error).toMatch(/one free account away/);
  });
});
