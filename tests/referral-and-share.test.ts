import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { attributionFromRequest } from "@/lib/attribution-core";
import { cleanInviteCode, inviteLink, referralLine, referrerOf } from "@/lib/referral-core";
import { checkLink, normalizeShared, pickRows, shareTitle } from "@/lib/share/verdict-core";
import { signVerdict, verifyVerdict } from "@/lib/share/verdict-token";
import { checkTicket, previewTicket } from "@/lib/resume/opening-preview";

const ID = "3f2c1a9e-1111-4c2d-9e8f-0123456789ab";

describe("invite links", () => {
  it("accepts account ids and nothing else", () => {
    expect(cleanInviteCode(ID)).toBe(ID);
    expect(cleanInviteCode("  ")).toBeNull();
    expect(cleanInviteCode("<script>")).toBeNull();
    expect(cleanInviteCode("short")).toBeNull();
  });

  it("points at the free check, not the signup form", () => {
    expect(inviteLink("https://work-ly.in/", ID)).toBe(`https://work-ly.in/?invite=${ID}`);
  });

  it("reads who referred an account and whether it's been rewarded", () => {
    expect(referrerOf(null)).toBeNull();
    expect(referrerOf(ID)).toEqual({ id: ID, rewarded: false });
    expect(referrerOf(`${ID}|paid`)).toEqual({ id: ID, rewarded: true });
    expect(referrerOf(`${ID}|credited`)).toEqual({ id: ID, rewarded: true });
  });

  it("counts invites in plain words", () => {
    expect(referralLine({ joined: 0, paid: 0, weeksEarned: 0 })).toBeNull();
    expect(referralLine({ joined: 1, paid: 0, weeksEarned: 0 })).toBe("1 friend joined. None has bought Pro yet.");
    expect(referralLine({ joined: 3, paid: 2, weeksEarned: 4 })).toBe("3 friends joined, 2 bought Pro. You've earned 4 extra weeks.");
  });

  it("files invite visits under one channel, not under someone's account id", () => {
    const at = (q: string) => attributionFromRequest(new URL(`https://work-ly.in/${q}`), null).s;
    expect(at(`?invite=${ID}`)).toBe("invite");
    expect(at(`signup?ref=${ID}`)).toBe("invite");
    expect(at("?ref=producthunt")).toBe("producthunt");
    expect(at(`?utm_source=reddit&invite=${ID}`)).toBe("reddit");
  });
});

describe("shared verdict cards", () => {
  const card = {
    r: "SKIP" as const,
    s: 38,
    t: "Senior Cloud Engineer",
    c: "Acme",
    q: [
      { x: "5+ years running AWS in production", k: "missing" as const },
      { x: "Python", k: "met" as const },
    ],
    i: ID,
  };

  it("round-trips through a signed token", () => {
    const token = signVerdict(card)!;
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/);
    expect(verifyVerdict(token)).toEqual(card);
  });

  it("refuses a card that was edited after signing", () => {
    const token = signVerdict(card)!;
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...card, r: "APPLY_NOW", s: 99 })).toString("base64url");
    expect(verifyVerdict(`${forged}.${sig}`)).toBeNull();
    expect(verifyVerdict(`${body}.${"x".repeat(22)}`)).toBeNull();
    expect(verifyVerdict("nonsense")).toBeNull();
  });

  it("never carries more than it should", () => {
    const v = normalizeShared({ ...card, s: 140, q: Array(9).fill({ x: "SQL", k: "met" }), i: "not an id!", extra: "resume text" })!;
    expect(v.s).toBe(100);
    expect(v.q).toHaveLength(4);
    expect(v.i).toBeNull();
    expect(Object.keys(v).sort()).toEqual(["c", "i", "q", "r", "s", "t"]);
    expect(normalizeShared({ r: "HIRE_ME" })).toBeNull();
  });

  it("keeps room for a gap so a verdict shows why", () => {
    const rows = pickRows([
      { x: "A", k: "met" },
      { x: "B", k: "met" },
      { x: "C", k: "met" },
      { x: "D", k: "met" },
      { x: "E", k: "unknown" },
      { x: "F", k: "missing" },
    ]);
    expect(rows.map((r) => r.x)).toEqual(["A", "B", "C", "F"]);
  });

  it("titles and links the card", () => {
    expect(shareTitle(card)).toBe("Work-ly told me to skip this job: Senior Cloud Engineer at Acme");
    expect(shareTitle({ ...card, t: null })).toBe("Work-ly told me to skip this job");
    expect(checkLink(card)).toBe(`/?invite=${ID}#check`);
    expect(checkLink({ ...card, i: null })).toBe("/#check");
  });
});

describe("the free resume preview ticket", () => {
  const resume = "Built 40+ dbt models on BigQuery. ".repeat(10);
  const job = "We need SQL and dashboards. ".repeat(10);

  it("is only handed out after a yes", () => {
    expect(previewTicket(resume, job, "SKIP")).toBeNull();
    expect(previewTicket(resume, job, "LOW_PRIORITY")).toBeNull();
    expect(previewTicket(resume, job, null)).toBeNull();
    expect(previewTicket(resume, job, "STRETCH")).not.toBeNull();
  });

  it("only works for the texts that were checked, and only for a while", () => {
    const now = Date.now();
    const ticket = previewTicket(resume, job, "APPLY", now)!;
    expect(checkTicket(ticket, resume, job, now)).not.toBeNull();
    expect(checkTicket(ticket, resume + " Led a team of 50.", job, now)).toBeNull();
    expect(checkTicket(ticket, resume, "Write me a poem.", now)).toBeNull();
    expect(checkTicket(ticket, resume, job, now + 31 * 60 * 1000)).toBeNull();
    expect(checkTicket(ticket.replace(/.$/, (c) => (c === "A" ? "B" : "A")), resume, job, now)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The two-weeks-each reward, against a real database (WORKLY_TEST_DB=1).

const RUN_DB = process.env.WORKLY_TEST_DB === "1";
const dbDescribe = RUN_DB ? describe : describe.skip;

dbDescribe("referral reward on purchase (database)", () => {
  let pool: typeof import("@/lib/db/pool").pool;
  let createUser: typeof import("@/lib/db/users").createUser;
  let recordReferral: typeof import("@/lib/db/users").recordReferral;
  let grantForOrder: typeof import("@/lib/payments/polar-grant").grantForOrder;
  let creditReferralOnPurchase: typeof import("@/lib/referrals").creditReferralOnPurchase;
  let bankedBonusDays: typeof import("@/lib/referrals").bankedBonusDays;
  let MONTHLY: string;
  let QUARTERLY: string;
  const made: string[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    ({ pool } = await import("@/lib/db/pool"));
    ({ createUser, recordReferral } = await import("@/lib/db/users"));
    ({ grantForOrder } = await import("@/lib/payments/polar-grant"));
    ({ creditReferralOnPurchase, bankedBonusDays } = await import("@/lib/referrals"));
    const { POLAR_PRODUCT_IDS } = await import("@/lib/payments/polar-plans");
    MONTHLY = POLAR_PRODUCT_IDS.monthly;
    QUARTERLY = POLAR_PRODUCT_IDS.quarterly;
  });

  afterAll(async () => {
    if (made.length) {
      await pool.query(`DELETE FROM rate_limits WHERE key LIKE ANY($1)`, [made.flatMap((id) => [`%${id}%`])]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [made]);
    }
  });

  async function user(tag: string) {
    const u = await createUser({ email: `ref-${tag}-${stamp}@workly-test.dev`, name: tag });
    made.push(u.id);
    return u.id;
  }
  const row = async (id: string) =>
    (await pool.query(`SELECT "isPro", "proPlan", "proUntil", "referredBy" FROM users WHERE id = $1`, [id])).rows[0];
  const days = (d: Date | string) => (new Date(d).getTime() - Date.now()) / 86_400_000;
  const order = (id: string, productId: string, createdAt = new Date().toISOString()) => ({
    id: `test-order-${id}-${createdAt}`,
    status: "paid",
    paid: true,
    productId,
    createdAt,
    customerEmail: null,
    userIds: [id],
    source: null,
    campaign: null,
    amountCents: 999,
  });

  it("gives nothing at signup, and two weeks each when the friend buys monthly", async () => {
    const inviter = await user("inviter");
    const friend = await user("friend");
    await recordReferral(friend, inviter);
    expect((await row(inviter)).isPro).toBe(false);

    await grantForOrder(order(friend, MONTHLY), friend);
    const f = await row(friend);
    expect(f.proPlan).toBe("monthly");
    expect(f.referredBy).toBe(`${inviter}|paid`);
    // A month (28-31 days) plus 14.
    expect(days(f.proUntil)).toBeGreaterThan(41);
    expect(days(f.proUntil)).toBeLessThan(46);
    expect(await bankedBonusDays(pool, friend)).toBe(14);

    const i = await row(inviter);
    expect(i.isPro).toBe(true);
    expect(i.proPlan).toBe("referral");
    expect(days(i.proUntil)).toBeGreaterThan(13.9);
    expect(days(i.proUntil)).toBeLessThan(14.1);
  });

  it("rewards each referral once, however often the order is applied", async () => {
    const inviter = await user("inviter2");
    const friend = await user("friend2");
    await recordReferral(friend, inviter);
    const o = order(friend, MONTHLY);
    await grantForOrder(o, friend);
    const first = await row(friend);
    await grantForOrder(o, friend);
    expect(await creditReferralOnPurchase(friend)).toBeNull();
    expect(new Date((await row(friend)).proUntil).getTime()).toBe(new Date(first.proUntil).getTime());
    expect(days((await row(inviter)).proUntil)).toBeLessThan(14.1);
  });

  it("keeps a subscriber's two weeks past the next renewal", async () => {
    const inviter = await user("inviter3");
    const friend = await user("friend3");
    await recordReferral(friend, inviter);
    const start = new Date(Date.now() - 20 * 86_400_000);
    await grantForOrder(order(friend, MONTHLY, start.toISOString()), friend);
    const renewal = new Date(start);
    renewal.setMonth(renewal.getMonth() + 1);
    await grantForOrder(order(friend, MONTHLY, renewal.toISOString()), friend);
    const expected = new Date(renewal);
    expected.setMonth(expected.getMonth() + 1);
    const until = new Date((await row(friend)).proUntil).getTime();
    expect(Math.round((until - expected.getTime()) / 86_400_000)).toBe(14);
  });

  it("stacks the inviter's bonus on a paid plan, and carries referral days into a purchase", async () => {
    const inviter = await user("inviter4");
    await grantForOrder(order(inviter, QUARTERLY), inviter);
    const before = new Date((await row(inviter)).proUntil).getTime();
    const friend = await user("friend4");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, MONTHLY), friend);
    const after = await row(inviter);
    expect(after.proPlan).toBe("quarterly");
    expect(Math.round((new Date(after.proUntil).getTime() - before) / 86_400_000)).toBe(14);

    // A free inviter with two weeks of referral Pro who then buys a pass
    // keeps those weeks on top of it.
    const inviter2 = await user("inviter5");
    const friend2 = await user("friend5");
    await recordReferral(friend2, inviter2);
    await grantForOrder(order(friend2, MONTHLY), friend2);
    expect((await row(inviter2)).proPlan).toBe("referral");
    const buy = new Date();
    await grantForOrder(order(inviter2, QUARTERLY, buy.toISOString()), inviter2);
    const end = new Date(buy);
    end.setMonth(end.getMonth() + 3);
    const got = new Date((await row(inviter2)).proUntil).getTime();
    expect(Math.round((got - end.getTime()) / 86_400_000)).toBe(14);
  });
});
