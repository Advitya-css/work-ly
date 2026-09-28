import "server-only";

import { cookies } from "next/headers";

import { pool } from "@/lib/db/pool";
import { ATTR_COOKIE, buildFunnelReport, clean, decodeAttribution, type Attribution, type FunnelReport } from "@/lib/attribution-core";

/**
 * THE REVENUE FUNNEL, BY CHANNEL.
 *
 * Counts each step against the visitor's first-touch source (see
 * attribution-core.ts): free check run, account created, checkout opened,
 * order paid (with its amount). Stored in rate_limits as never-expiring
 * rows - the same key/count store the refund window uses - so it needs no
 * migration:
 *
 *   funnel:grader:<day>:<source>:<campaign>            count = checks that day
 *   funnel:paywall:<day>:<source>:<campaign>           count = views of the "tailor my resume" offer
 *   funnel:checkout:<day>:<source>:<campaign>          count = checkouts opened
 *   funnel:signup:<day>:<source>:<campaign>:<userId>   one row per account
 *   funnel:paid:<day>:<source>:<campaign>:<orderId>    count = amount in cents
 *
 * Recording never throws and never blocks the user's action.
 */

const FOREVER = "2100-01-01T00:00:00Z";

export async function currentAttribution(): Promise<Attribution | null> {
  try {
    return decodeAttribution((await cookies()).get(ATTR_COOKIE)?.value);
  } catch {
    return null;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const part = (v: string | null | undefined) => clean(v) || "none";

/** A step counted per day (free checks, checkouts opened). */
export async function recordFunnelStep(step: "grader" | "paywall" | "checkout"): Promise<void> {
  try {
    const a = await currentAttribution();
    const key = `funnel:${step}:${today()}:${part(a?.s ?? "unknown")}:${part(a?.c)}`;
    await pool.query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1`,
      [key, FOREVER],
    );
  } catch (error) {
    console.warn("[workly:funnel] could not record step:", error instanceof Error ? error.message : error);
  }
}

/** One row per new account, so a repeated sign-in is never counted twice. */
export async function recordSignup(userId: string): Promise<void> {
  try {
    const a = await currentAttribution();
    const key = `funnel:signup:${today()}:${part(a?.s ?? "unknown")}:${part(a?.c)}:${userId}`;
    await pool.query(`INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2) ON CONFLICT (key) DO NOTHING`, [key, FOREVER]);
  } catch (error) {
    console.warn("[workly:funnel] could not record signup:", error instanceof Error ? error.message : error);
  }
}

/**
 * A paid order, once per order id (the webhook and the return-from-checkout
 * sync both grant, so this must be idempotent). Source comes from the
 * checkout metadata Work-ly attached, not from whoever is browsing now.
 */
export async function recordPaidOrder(input: {
  orderId: string;
  createdAt: string;
  source: string | null;
  campaign: string | null;
  amountCents: number | null;
}): Promise<void> {
  try {
    const day = (input.createdAt || new Date().toISOString()).slice(0, 10);
    const key = `funnel:paid:${day}:${part(input.source ?? "unknown")}:${part(input.campaign)}:${input.orderId}`;
    const cents = Math.max(0, Math.round(input.amountCents ?? 0));
    await pool.query(`INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`, [
      key,
      cents,
      FOREVER,
    ]);
  } catch (error) {
    console.warn("[workly:funnel] could not record paid order:", error instanceof Error ? error.message : error);
  }
}

export async function getFunnelReport(days = 30): Promise<FunnelReport> {
  const { rows } = await pool.query<{ key: string; count: number }>(
    `SELECT key, count FROM rate_limits WHERE key LIKE 'funnel:%'`,
  );
  return buildFunnelReport(
    rows.map((r) => ({ key: r.key, count: Number(r.count) })),
    days,
  );
}

/**
 * Money banked since a day: paid orders minus refunds, all channels, plus
 * paid orders and revenue by first-touch source (for partner payouts).
 */
export async function getRevenueSince(sinceDay: string): Promise<{
  paidCents: number;
  refundedCents: number;
  orders: number;
  bySource: Record<string, { orders: number; cents: number }>;
}> {
  const { rows } = await pool.query<{ key: string; count: number }>(
    `SELECT key, count FROM rate_limits WHERE key LIKE 'funnel:paid:%' OR key LIKE 'funnel:refund:%'`,
  );
  let paidCents = 0;
  let refundedCents = 0;
  let orders = 0;
  const bySource: Record<string, { orders: number; cents: number }> = {};
  for (const r of rows) {
    const [, step, day, source] = r.key.split(":");
    if (!day || day < sinceDay) continue;
    const cents = Number(r.count) || 0;
    if (step === "refund") {
      refundedCents += cents;
      continue;
    }
    paidCents += cents;
    orders += 1;
    const s = source || "unknown";
    bySource[s] ??= { orders: 0, cents: 0 };
    bySource[s].orders += 1;
    bySource[s].cents += cents;
  }
  return { paidCents, refundedCents, orders, bySource };
}

/**
 * A refund (full or partial), once per order, dated by the ORDER's day so a
 * repeated webhook never counts it twice: funnel:refund:<day>:<orderId> =
 * the largest amount refunded so far, in cents.
 */
export async function recordRefund(orderId: string, cents: number, orderCreatedAt: string): Promise<void> {
  try {
    const key = `funnel:refund:${(orderCreatedAt || new Date().toISOString()).slice(0, 10)}:${orderId}`;
    await pool.query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET count = GREATEST(rate_limits.count, EXCLUDED.count)`,
      [key, Math.max(0, Math.round(cents)), FOREVER],
    );
  } catch (error) {
    console.warn("[workly:funnel] could not record refund:", error instanceof Error ? error.message : error);
  }
}
