import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Every path through the "two extra weeks each" referral reward, against a
 * real database (WORKLY_TEST_DB=1): who counts as a referral, every kind of
 * account the reward can land on, renewals, lapses, revocations, refunds,
 * the yearly cap and concurrent payment events. Includes the Polar webhook
 * itself, with only the signature check stubbed.
 */

vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: (body: string) => JSON.parse(body),
  WebhookVerificationError: class extends Error {},
}));

const RUN_DB = process.env.WORKLY_TEST_DB === "1";
const dbDescribe = RUN_DB ? describe : describe.skip;
const DAY = 86_400_000;

dbDescribe("referral reward: every path (database)", () => {
  let pool: typeof import("@/lib/db/pool").pool;
  let createUser: typeof import("@/lib/db/users").createUser;
  let recordReferral: typeof import("@/lib/db/users").recordReferral;
  let grantForOrder: typeof import("@/lib/payments/polar-grant").grantForOrder;
  let refs: typeof import("@/lib/referrals");
  let POST: typeof import("@/app/api/webhooks/polar/route").POST;
  let IDS: Record<"monthly" | "quarterly" | "yearly", string>;
  const made: string[] = [];
  const stamp = Date.now();
  let n = 0;

  beforeAll(async () => {
    process.env.POLAR_WEBHOOK_SECRET = "test-secret";
    ({ pool } = await import("@/lib/db/pool"));
    ({ createUser, recordReferral } = await import("@/lib/db/users"));
    ({ grantForOrder } = await import("@/lib/payments/polar-grant"));
    refs = await import("@/lib/referrals");
    ({ POST } = await import("@/app/api/webhooks/polar/route"));
    IDS = (await import("@/lib/payments/polar-plans")).POLAR_PRODUCT_IDS;
  });

  afterAll(async () => {
    if (!made.length) return;
    for (const id of made) await pool.query(`DELETE FROM rate_limits WHERE key LIKE $1`, [`%${id}%`]);
    await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [made]);
  });

  async function user(tag: string, set: Record<string, unknown> = {}) {
    const u = await createUser({ email: `refpath-${tag}-${stamp}-${n++}@workly-test.dev`, name: `${tag} Tester` });
    made.push(u.id);
    const cols = Object.keys(set);
    if (cols.length) {
      await pool.query(
        `UPDATE users SET ${cols.map((c, i) => `"${c}" = $${i + 2}`).join(", ")} WHERE id = $1`,
        [u.id, ...cols.map((c) => set[c])],
      );
    }
    return u.id;
  }
  const row = async (id: string) =>
    (await pool.query(`SELECT "isPro", "proPlan", "proUntil", "referredBy" FROM users WHERE id = $1`, [id])).rows[0];
  const until = async (id: string) => new Date((await row(id)).proUntil).getTime();
  const daysFromNow = async (id: string) => (await until(id) - Date.now()) / DAY;
  const addMonths = (d: Date, m: number) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + m);
    return x;
  };
  const order = (id: string, plan: "monthly" | "quarterly" | "yearly", at = new Date(), oid?: string) => ({
    id: oid ?? `o-${id}-${plan}-${at.toISOString()}`,
    status: "paid",
    paid: true,
    productId: IDS[plan],
    createdAt: at.toISOString(),
    customerEmail: null,
    userIds: [id],
    source: null,
    campaign: null,
    amountCents: 999,
  });
  const webhook = (type: string, data: unknown) =>
    POST(new Request("http://localhost/api/webhooks/polar", { method: "POST", body: JSON.stringify({ type, data }) }));
  const rawOrder = (id: string, plan: "monthly" | "quarterly" | "yearly", extra: Record<string, unknown> = {}) => ({
    id: `wh-${id}-${plan}-${n++}`,
    status: "paid",
    paid: true,
    product_id: IDS[plan],
    created_at: new Date().toISOString(),
    metadata: { user_id: id },
    customer: { email: "x@workly-test.dev", external_id: id },
    ...extra,
  });

  // --- who counts as a referral ---------------------------------------------

  it("records only a real, different inviter, and the first one wins", async () => {
    const a = await user("a");
    const b = await user("b");
    const fresh = await user("fresh");
    await recordReferral(fresh, "00000000-0000-4000-8000-000000000000"); // no such account
    expect((await row(fresh)).referredBy).toBeNull();
    await recordReferral(fresh, fresh); // themselves
    expect((await row(fresh)).referredBy).toBeNull();
    await recordReferral(fresh, a);
    await recordReferral(fresh, b);
    expect((await row(fresh)).referredBy).toBe(a);
  });

  it("gives nothing for a purchase by someone nobody invited", async () => {
    const solo = await user("solo");
    await grantForOrder(order(solo, "monthly"), solo);
    expect(await refs.creditReferralOnPurchase(solo)).toBeNull();
    expect(await refs.bankedBonusDays(pool, solo)).toBe(0);
    const d = await daysFromNow(solo);
    expect(d).toBeGreaterThan(27);
    expect(d).toBeLessThan(32);
  });

  it("never pays twice for someone the old signup reward already covered", async () => {
    const inviter = await user("old-inviter");
    const friend = await user("old-friend");
    await pool.query(`UPDATE users SET "referredBy" = $2 WHERE id = $1`, [friend, `${inviter}|credited`]);
    await grantForOrder(order(friend, "monthly"), friend);
    expect((await row(friend)).referredBy).toBe(`${inviter}|credited`);
    expect((await row(inviter)).isPro).toBe(false);
  });

  // --- where the inviter's two weeks land ----------------------------------

  it("free inviter: two weeks from today on a 'referral' plan", async () => {
    const inviter = await user("free");
    const friend = await user("f1");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "quarterly"), friend);
    expect((await row(friend)).referredBy).toBe(`${inviter}|paid`);
    expect((await row(inviter)).proPlan).toBe("referral");
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);
  });

  it("inviter whose Pro ran out: restarts today, not from the old end date", async () => {
    const inviter = await user("lapsed", { isPro: true, proPlan: "quarterly", proUntil: new Date(Date.now() - 40 * DAY) });
    const friend = await user("f2");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    expect((await row(inviter)).proPlan).toBe("referral");
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);
  });

  it("inviter on the 1-day trial: trial end plus two weeks, no longer a trial", async () => {
    const trialEnd = new Date(Date.now() + 10 * 3_600_000);
    const inviter = await user("trial", { isPro: true, proPlan: "trial", proUntil: trialEnd });
    const friend = await user("f3");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    const r = await row(inviter);
    expect(r.proPlan).toBe("referral");
    expect(Math.round((new Date(r.proUntil).getTime() - trialEnd.getTime()) / DAY)).toBe(14);
  });

  it("inviter on a pass, a seat or a beta gift: keeps the plan, end moves two weeks", async () => {
    for (const plan of ["yearly", "seat", "beta", "sprint"]) {
      const end = new Date(Date.now() + 50 * DAY);
      const inviter = await user(`kept-${plan}`, { isPro: true, proPlan: plan, proUntil: end });
      const friend = await user(`f-${plan}`);
      await recordReferral(friend, inviter);
      await grantForOrder(order(friend, "monthly"), friend);
      const r = await row(inviter);
      expect(r.proPlan).toBe(plan);
      expect(Math.round((new Date(r.proUntil).getTime() - end.getTime()) / DAY)).toBe(14);
      expect(await refs.bankedBonusDays(pool, inviter)).toBe(0);
    }
  });

  it("inviter with open-ended Pro: nothing changes", async () => {
    const inviter = await user("forever", { isPro: true, proPlan: "beta", proUntil: null });
    const friend = await user("f4");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    expect((await row(inviter)).proUntil).toBeNull();
    expect((await row(inviter)).isPro).toBe(true);
  });

  it("monthly inviter: two weeks now, and still two weeks after their next renewal", async () => {
    const start = new Date(Date.now() - 10 * DAY);
    const inviter = await user("monthly-inviter");
    await grantForOrder(order(inviter, "monthly", start), inviter);
    const friend = await user("f5");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    expect(Math.round((await until(inviter) - addMonths(start, 1).getTime()) / DAY)).toBe(14);
    expect(await refs.bankedBonusDays(pool, inviter)).toBe(14);
    const renewal = addMonths(start, 1);
    await grantForOrder(order(inviter, "monthly", renewal), inviter);
    expect(Math.round((await until(inviter) - addMonths(renewal, 1).getTime()) / DAY)).toBe(14);
  });

  it("three friends buy: a monthly inviter keeps six weeks on top of every renewal", async () => {
    const start = new Date(Date.now() - 5 * DAY);
    const inviter = await user("popular");
    await grantForOrder(order(inviter, "monthly", start), inviter);
    for (let i = 0; i < 3; i++) {
      const f = await user(`pop-f${i}`);
      await recordReferral(f, inviter);
      await grantForOrder(order(f, "monthly"), f);
    }
    expect(await refs.bankedBonusDays(pool, inviter)).toBe(42);
    const renewal = addMonths(start, 1);
    await grantForOrder(order(inviter, "monthly", renewal), inviter);
    expect(Math.round((await until(inviter) - addMonths(renewal, 1).getTime()) / DAY)).toBe(42);
  });

  // --- the buyer's side -----------------------------------------------------

  it("buyer on a pass gets two weeks on the pass, nothing banked", async () => {
    for (const plan of ["quarterly", "yearly"] as const) {
      const inviter = await user(`pi-${plan}`);
      const friend = await user(`pf-${plan}`);
      await recordReferral(friend, inviter);
      const at = new Date();
      await grantForOrder(order(friend, plan, at), friend);
      const expected = addMonths(at, plan === "quarterly" ? 3 : 12).getTime() + 14 * DAY;
      expect(Math.abs((await until(friend)) - expected)).toBeLessThan(2 * 60_000);
      expect(await refs.bankedBonusDays(pool, friend)).toBe(0);
      expect((await row(friend)).proPlan).toBe(plan);
    }
  });

  it("buyer who was on the trial ends up on the paid plan, not the trial", async () => {
    const inviter = await user("ti");
    const friend = await user("tf", { isPro: true, proPlan: "trial", proUntil: new Date(Date.now() + 5 * 3_600_000) });
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    expect((await row(friend)).proPlan).toBe("monthly");
  });

  it("days left on a referral plan carry into a monthly purchase and survive the renewal", async () => {
    const inviter = await user("carry-i");
    const friend = await user("carry-f");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "quarterly"), friend);
    // The inviter now has ~14 referral days, and buys monthly 4 days later.
    await pool.query(`UPDATE users SET "proUntil" = "proUntil" - interval '4 days' WHERE id = $1`, [inviter]);
    const at = new Date();
    await grantForOrder(order(inviter, "monthly", at), inviter);
    expect(await refs.bankedBonusDays(pool, inviter)).toBe(10);
    expect(Math.round((await until(inviter) - addMonths(at, 1).getTime()) / DAY)).toBe(10);
    await grantForOrder(order(inviter, "monthly", addMonths(at, 1)), inviter);
    expect(Math.round((await until(inviter) - addMonths(at, 2).getTime()) / DAY)).toBe(10);
  });

  it("a subscription that lapsed and restarts doesn't get the old bonus again", async () => {
    const inviter = await user("lapse-i");
    const friend = await user("lapse-f");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    expect(await refs.bankedBonusDays(pool, friend)).toBe(14);
    await pool.query(`UPDATE users SET "proUntil" = now() - interval '30 days' WHERE id = $1`, [friend]);
    // Cancelled; access ran out weeks ago. They come back today.
    const back = new Date();
    await grantForOrder(order(friend, "monthly", back), friend);
    expect(await refs.bankedBonusDays(pool, friend)).toBe(0);
    expect(Math.round((await until(friend) - addMonths(back, 1).getTime()) / DAY)).toBe(0);
  });

  // --- caps, repeats, races -------------------------------------------------

  it("caps the inviter at 12 bonuses a year; the 13th friend still gets theirs", async () => {
    const inviter = await user("cap");
    for (let i = 0; i < 13; i++) {
      const f = await user(`cap-f${i}`);
      await recordReferral(f, inviter);
      await grantForOrder(order(f, "quarterly"), f);
      if (i === 12) {
        expect((await row(f)).referredBy).toBe(`${inviter}|paid`);
        const d = (await until(f) - addMonths(new Date(), 3).getTime()) / DAY;
        expect(Math.round(d)).toBe(14);
      }
    }
    expect(Math.round(await daysFromNow(inviter))).toBe(12 * 14);
    expect((await refs.referralStats(inviter))).toEqual({ joined: 13, paid: 13, weeksEarned: 24 });
  });

  it("the same order arriving three times at once rewards once", async () => {
    const inviter = await user("race-i");
    const friend = await user("race-f");
    await recordReferral(friend, inviter);
    const o = order(friend, "monthly");
    await Promise.all([grantForOrder(o, friend), grantForOrder(o, friend), grantForOrder(o, friend)]);
    expect(await refs.bankedBonusDays(pool, friend)).toBe(14);
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);
    const d = (await until(friend) - addMonths(new Date(o.createdAt), 1).getTime()) / DAY;
    expect(Math.round(d)).toBe(14);
  });

  it("two friends buying at the same moment both count for the inviter", async () => {
    const inviter = await user("dual-i");
    const f1 = await user("dual-f1");
    const f2 = await user("dual-f2");
    await recordReferral(f1, inviter);
    await recordReferral(f2, inviter);
    await Promise.all([grantForOrder(order(f1, "monthly"), f1), grantForOrder(order(f2, "yearly"), f2)]);
    expect(Math.round(await daysFromNow(inviter))).toBe(28);
  });

  it("a late-processed order (restore purchase) keeps the buyer on the plan they paid for", async () => {
    const inviter = await user("late-i");
    const friend = await user("late-f");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly", new Date(Date.now() - 45 * DAY)), friend);
    expect((await row(friend)).proPlan).toBe("monthly");
  });

  it("an unpaid or unknown order changes nothing", async () => {
    const inviter = await user("unpaid-i");
    const friend = await user("unpaid-f");
    await recordReferral(friend, inviter);
    expect(await grantForOrder({ ...order(friend, "monthly"), paid: false, status: "pending" }, friend)).toBeNull();
    expect(await grantForOrder({ ...order(friend, "monthly"), productId: "nope" }, friend)).toBeNull();
    expect((await row(friend)).referredBy).toBe(inviter);
    expect((await row(inviter)).isPro).toBe(false);
  });

  it("an inviter whose account is gone: the buyer still gets their two weeks", async () => {
    const ghost = await user("ghost");
    const friend = await user("ghost-f");
    await recordReferral(friend, ghost);
    await pool.query(`DELETE FROM users WHERE id = $1`, [ghost]);
    await grantForOrder(order(friend, "quarterly"), friend);
    expect((await row(friend)).referredBy).toBe(`${ghost}|paid`);
    const d = (await until(friend) - addMonths(new Date(), 3).getTime()) / DAY;
    expect(Math.round(d)).toBe(14);
  });

  // --- through the real webhook --------------------------------------------

  it("webhook: a paid order rewards both; a full refund takes the inviter's weeks back", async () => {
    const inviter = await user("wh-i");
    const friend = await user("wh-f");
    await recordReferral(friend, inviter);
    const paid = rawOrder(friend, "quarterly");
    expect((await webhook("order.paid", paid)).status).toBe(200);
    expect((await webhook("order.updated", paid)).status).toBe(200); // the same order again
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);

    const refunded = { ...paid, status: "refunded", refunded_amount: 999 };
    expect((await webhook("order.refunded", refunded)).status).toBe(200);
    expect((await row(friend)).isPro).toBe(false);
    expect((await row(friend)).referredBy).toBe(inviter); // unrewarded again
    expect(await daysFromNow(inviter)).toBeLessThan(0.01);
    // Repeated refund events change nothing more.
    await webhook("order.refunded", refunded);
    expect(await refs.revokeReferralOnRefund(friend)).toBe(false);

    // If they buy for real later, the reward is paid once more.
    await webhook("order.paid", rawOrder(friend, "monthly"));
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);
  });

  it("webhook refund: a monthly inviter loses the banked two weeks too", async () => {
    const inviter = await user("whm-i");
    await grantForOrder(order(inviter, "monthly"), inviter);
    const before = await until(inviter);
    const friend = await user("whm-f");
    await recordReferral(friend, inviter);
    const paid = rawOrder(friend, "monthly");
    await webhook("order.paid", paid);
    expect(await refs.bankedBonusDays(pool, inviter)).toBe(14);
    await webhook("order.refunded", { ...paid, status: "refunded", refunded_amount: 999 });
    expect(await refs.bankedBonusDays(pool, inviter)).toBe(0);
    expect(Math.round((await until(inviter) - before) / DAY)).toBe(0);
    expect(await refs.bankedBonusDays(pool, friend)).toBe(0);
  });

  it("webhook: a partial refund is goodwill and takes nothing back", async () => {
    const inviter = await user("part-i");
    const friend = await user("part-f");
    await recordReferral(friend, inviter);
    const paid = rawOrder(friend, "quarterly");
    await webhook("order.paid", paid);
    await webhook("order.refunded", { ...paid, status: "partially_refunded", refunded_amount: 100 });
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);
    expect((await row(friend)).referredBy).toBe(`${inviter}|paid`);
  });

  it("webhook: a revoked subscription keeps the banked bonus days, then uses them up", async () => {
    const inviter = await user("rev-i");
    const friend = await user("rev-f");
    await recordReferral(friend, inviter);
    const paid = rawOrder(friend, "monthly");
    await webhook("order.paid", paid);
    expect((await webhook("subscription.revoked", { id: "sub-1", metadata: { user_id: friend }, customer: { external_id: friend } })).status).toBe(200);
    const r = await row(friend);
    expect(r.isPro).toBe(true);
    expect(await daysFromNow(friend)).toBeCloseTo(14, 1);
    expect(await refs.bankedBonusDays(pool, friend)).toBe(0);
    // And a subscriber with no bonus loses access at once, as before.
    const plain = await user("rev-plain");
    await webhook("order.paid", rawOrder(plain, "monthly"));
    await webhook("subscription.revoked", { id: "sub-2", metadata: { user_id: plain }, customer: { external_id: plain } });
    expect((await row(plain)).isPro).toBe(false);
  });

  it("the Application Sprint includes Pro, so it counts; its refund takes it back", async () => {
    const { deliverOfferOrder, refundOfferOrder } = await import("@/lib/payments/offer-orders");
    const inviter = await user("sprint-i");
    const friend = await user("sprint-f");
    await recordReferral(friend, inviter);
    const o = { ...order(friend, "quarterly"), productId: "sprint-product", amountCents: 4900 };
    await deliverOfferOrder(o, "sprint");
    expect((await row(friend)).proPlan).toBe("sprint");
    expect((await row(friend)).referredBy).toBe(`${inviter}|paid`);
    expect(await daysFromNow(inviter)).toBeCloseTo(14, 1);
    await refundOfferOrder({ ...o, status: "refunded" }, "sprint");
    expect((await row(friend)).isPro).toBe(false);
    expect(await daysFromNow(inviter)).toBeLessThan(0.01);
  });

  // --- the rest of the app treats invite Pro as "not paid" -----------------

  it("counts invite Pro as not paying in the founding-ten queue", async () => {
    const inviter = await user("queue-i");
    const friend = await user("queue-f");
    await recordReferral(friend, inviter);
    await grantForOrder(order(friend, "monthly"), friend);
    await pool.query(`UPDATE users SET "emailVerified" = true WHERE id = $1`, [inviter]);
    const { foundingTenQueue } = await import("@/lib/founding-ten");
    const { rows } = await foundingTenQueue(500);
    expect(rows.some((r) => r.userId === inviter)).toBe(true);
    expect(rows.some((r) => r.userId === friend)).toBe(false);
  });
});
