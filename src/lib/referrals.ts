import "server-only";

import type { PoolClient } from "pg";

import { pool } from "@/lib/db/pool";
import {
  MAX_REFERRAL_BONUSES_PER_YEAR,
  PAID_MARKER,
  REFERRAL_BONUS_DAYS,
  referrerOf,
  type ReferralStats,
} from "@/lib/referral-core";

/**
 * INVITE A FRIEND: when someone you invited buys Pro, you both get two
 * extra weeks of Pro. Called once a paid order has been granted
 * (lib/payments/polar-grant.ts); safe to call any number of times.
 *
 * Where the two weeks go depends on the account:
 *   - on a monthly subscription: added to the current end AND kept as
 *     "bonus days" on top of every renewal (Polar renewals would otherwise
 *     overwrite the extended date), so the subscriber always has two weeks
 *     of Pro left after their paid time;
 *   - on a pass, a gift or nothing at all: added to the end date (from
 *     today if Pro had run out), as a plan called "referral";
 *   - Pro with no end date: nothing to add.
 */

export function bonusKey(userId: string): string {
  return `pro_bonus_days:${userId}`;
}

/** Bonus days kept on top of every monthly renewal. */
export async function bankedBonusDays(client: PoolClient | typeof pool, userId: string): Promise<number> {
  const { rows } = await client.query(`SELECT count FROM rate_limits WHERE key = $1 AND expires_at > now()`, [bonusKey(userId)]);
  return Number(rows[0]?.count ?? 0) || 0;
}

export async function addBankedDays(client: PoolClient, userId: string, days: number): Promise<void> {
  if (days <= 0) return;
  await client.query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, '2100-01-01T00:00:00Z')
     ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + EXCLUDED.count, expires_at = '2100-01-01T00:00:00Z'`,
    [bonusKey(userId), days],
  );
}

export async function clearBankedDays(client: PoolClient | typeof pool, userId: string): Promise<void> {
  await client.query(`DELETE FROM rate_limits WHERE key = $1`, [bonusKey(userId)]);
}

/** Two extra weeks for one account, inside the caller's transaction. */
async function giveBonus(client: PoolClient, userId: string, { buyer = false }: { buyer?: boolean } = {}): Promise<boolean> {
  const now = new Date();
  const { rows } = await client.query(`SELECT "isPro", "proPlan", "proUntil" FROM users WHERE id = $1 FOR UPDATE`, [userId]);
  const u = rows[0];
  if (!u) return false;
  if (u.isPro && u.proUntil == null) return true; // open-ended Pro: nothing to extend
  const active = Boolean(u.isPro && u.proUntil && new Date(u.proUntil).getTime() > now.getTime());
  const plan = (u.proPlan as string | null) ?? null;

  if (active && plan === "monthly") await addBankedDays(client, userId, REFERRAL_BONUS_DAYS);
  // An active purchase or gift keeps its plan name; anything else (free,
  // expired, the 1-day trial) becomes a "referral" plan, which is Pro
  // without the trial's limits and still free to buy a plan on top of.
  // The buyer always keeps the plan they just paid for, even when the
  // order is processed late (a delayed webhook, "Restore purchase").
  const keepPlan = (active || buyer) && plan != null && plan !== "trial";
  await client.query(
    `UPDATE users
        SET "isPro" = true,
            "proUntil" = GREATEST(COALESCE("proUntil", now()), now()) + make_interval(days => $2),
            "proPlan" = CASE WHEN $3 THEN "proPlan" ELSE 'referral' END,
            "updatedAt" = now()
      WHERE id = $1`,
    [userId, REFERRAL_BONUS_DAYS, keepPlan],
  );
  return true;
}

export interface ReferralReward {
  referrerId: string;
  buyerRewarded: boolean;
  referrerRewarded: boolean;
}

/**
 * The buyer just paid. If someone invited them and this referral hasn't
 * been rewarded yet, both get two extra weeks (the inviter at most
 * MAX_REFERRAL_BONUSES_PER_YEAR times a year). Returns what happened, or
 * null when there was nothing to reward.
 */
export async function creditReferralOnPurchase(buyerId: string): Promise<ReferralReward | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT "referredBy" FROM users WHERE id = $1 FOR UPDATE`, [buyerId]);
    const ref = referrerOf(rows[0]?.referredBy as string | null | undefined);
    if (!ref || ref.rewarded || ref.id === buyerId) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(`UPDATE users SET "referredBy" = $2 WHERE id = $1`, [buyerId, `${ref.id}${PAID_MARKER}`]);
    const buyerRewarded = await giveBonus(client, buyerId, { buyer: true });

    // One marker per rewarded friend, kept for a year: the yearly cap.
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM rate_limits WHERE key LIKE $1 AND expires_at > now()`,
      [`referral_bonus:${ref.id}:%`],
    );
    let referrerRewarded = false;
    if ((countRows[0]?.n ?? 0) < MAX_REFERRAL_BONUSES_PER_YEAR) {
      const claim = await client.query(
        `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, now() + interval '365 days')
         ON CONFLICT (key) DO NOTHING RETURNING key`,
        [`referral_bonus:${ref.id}:${buyerId}`],
      );
      if (claim.rowCount) referrerRewarded = await giveBonus(client, ref.id);
    }
    await client.query("COMMIT");
    console.info(`[workly:referral] ${buyerId} bought Pro; bonus for buyer=${buyerRewarded} referrer=${referrerRewarded}`);
    return { referrerId: ref.id, buyerRewarded, referrerRewarded };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Takes one bonus back (a refunded referral), inside the caller's transaction. */
async function takeBackBonus(client: PoolClient, userId: string): Promise<void> {
  const banked = await bankedBonusDays(client, userId);
  if (banked > 0) {
    await client.query(`UPDATE rate_limits SET count = GREATEST(count - $2, 0) WHERE key = $1`, [
      bonusKey(userId),
      Math.min(banked, REFERRAL_BONUS_DAYS),
    ]);
  }
  await client.query(
    `UPDATE users
        SET "proUntil" = GREATEST(now(), "proUntil" - make_interval(days => $2)), "updatedAt" = now()
      WHERE id = $1 AND "proUntil" IS NOT NULL`,
    [userId, REFERRAL_BONUS_DAYS],
  );
}

/**
 * The invited person's purchase was refunded in full: the reward came from
 * a sale that didn't happen, so the inviter's two weeks are taken back (a
 * buy-and-refund loop would otherwise farm free Pro), the buyer's banked
 * bonus goes with their access, and the referral counts as unrewarded
 * again so a real purchase later still pays out. Safe to call repeatedly.
 */
export async function revokeReferralOnRefund(buyerId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT "referredBy" FROM users WHERE id = $1 FOR UPDATE`, [buyerId]);
    const raw = (rows[0]?.referredBy as string | null | undefined) ?? null;
    const ref = referrerOf(raw);
    if (!ref || !raw?.endsWith(PAID_MARKER)) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(`UPDATE users SET "referredBy" = $2 WHERE id = $1`, [buyerId, ref.id]);
    await clearBankedDays(client, buyerId);
    const claim = await client.query(`DELETE FROM rate_limits WHERE key = $1 RETURNING key`, [`referral_bonus:${ref.id}:${buyerId}`]);
    if (claim.rowCount) {
      await client.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [ref.id]);
      await takeBackBonus(client, ref.id);
    }
    await client.query("COMMIT");
    console.info(`[workly:referral] ${buyerId} refunded; referral reward taken back`);
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Tells the inviter they've earned two weeks. Never throws. */
export async function emailReferrerReward(referrerId: string): Promise<void> {
  try {
    const { rows } = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [referrerId]);
    const email = rows[0]?.email as string | undefined;
    if (!email) return;
    const first = String(rows[0]?.name ?? "").trim().split(/\s+/)[0];
    const { sendReceiptEmail } = await import("@/lib/email");
    await sendReceiptEmail(email, {
      subject: "Someone you invited joined Work-ly Pro",
      heading: `${first ? `${first}, you` : "You"}'ve got two extra weeks of Pro`,
      paragraphs: [
        "Someone who joined Work-ly through your invite link has just bought Pro, so you both get two extra weeks of Pro. It's already on your account.",
        "Thank you for passing Work-ly on. Every friend who buys through your link adds another two weeks.",
      ],
      cta: { label: "See your plan", path: "/settings#plan" },
    });
  } catch (error) {
    console.warn("[workly:referral] reward email failed:", error instanceof Error ? error.message : error);
  }
}

/** How someone's invites are doing, for the Settings card. */
export async function referralStats(userId: string): Promise<ReferralStats> {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE "referredBy" IN ($1, $1 || '|credited', $1 || '|paid'))::int AS joined,
         COUNT(*) FILTER (WHERE "referredBy" = $1 || '|paid')::int AS paid
       FROM users WHERE "referredBy" LIKE $1 || '%'`,
      [userId],
    );
    const { rows: bonus } = await pool.query(`SELECT COUNT(*)::int AS n FROM rate_limits WHERE key LIKE $1`, [
      `referral_bonus:${userId}:%`,
    ]);
    const joined = Number(rows[0]?.joined ?? 0);
    const paid = Number(rows[0]?.paid ?? 0);
    return { joined, paid, weeksEarned: Math.round((Number(bonus[0]?.n ?? 0) * REFERRAL_BONUS_DAYS) / 7) };
  } catch {
    return { joined: 0, paid: 0, weeksEarned: 0 };
  }
}
