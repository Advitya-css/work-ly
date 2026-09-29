import "server-only";

import { pool } from "@/lib/db/pool";
import {
  parseSeatMetaKey,
  seatMetaKey,
  seatRowCodes,
  seatRowPattern,
} from "@/lib/payments/seat-codes-core";

/**
 * SEAT CODES - creating, redeeming and switching them off. See
 * seat-codes-core.ts for the storage idea (N single-use rows per code in
 * beta_codes, plus one `seatcode:` row in rate_limits for the months and a
 * label). No migration.
 */

const FOREVER = "2100-01-01T00:00:00Z";

export interface SeatGroup {
  group: string;
  label: string;
  months: number;
  seats: number;
  used: number;
  /** Seats switched off (a refunded pack), not redeemed by anyone. */
  disabled: number;
  createdAt: Date | null;
}

/**
 * Creates the code's seats. Idempotent: a code that already has rows is
 * left exactly as it is (a retried webhook must never add seats).
 */
export async function createSeatCode(input: { group: string; seats: number; months: number; label: string }): Promise<SeatGroup> {
  const existing = await getSeatGroup(input.group);
  if (existing) return existing;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const code of seatRowCodes(input.group, input.seats)) {
      await client.query(
        `INSERT INTO beta_codes (id, code, "isUsed", "createdAt") VALUES (gen_random_uuid(), $1, false, now())
         ON CONFLICT (code) DO NOTHING`,
        [code],
      );
    }
    await client.query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING`,
      [seatMetaKey(input.group, input.label), Math.max(1, Math.round(input.months)), FOREVER],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return (await getSeatGroup(input.group))!;
}

async function metaFor(group: string): Promise<{ label: string; months: number } | null> {
  const { rows } = await pool.query<{ key: string; count: number }>(
    `SELECT key, count FROM rate_limits WHERE key LIKE $1 LIMIT 1`,
    [`seatcode:${group}:%`],
  );
  const parsed = rows[0] ? parseSeatMetaKey(rows[0].key) : null;
  return parsed ? { label: parsed.label, months: Number(rows[0].count) || 3 } : null;
}

export async function getSeatGroup(group: string): Promise<SeatGroup | null> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS seats,
            COUNT(*) FILTER (WHERE "isUsed" AND "usedByUserId" IS NOT NULL)::int AS used,
            COUNT(*) FILTER (WHERE "isUsed" AND "usedByUserId" IS NULL)::int AS disabled,
            MIN("createdAt") AS created
       FROM beta_codes WHERE code LIKE $1`,
    [seatRowPattern(group)],
  );
  const r = rows[0];
  if (!r || Number(r.seats) === 0) return null;
  const meta = await metaFor(group);
  return {
    group,
    label: meta?.label ?? "manual",
    months: meta?.months ?? 3,
    seats: Number(r.seats),
    used: Number(r.used),
    disabled: Number(r.disabled),
    createdAt: r.created ? new Date(r.created) : null,
  };
}

/** Every seat code, newest first - for the admin page. */
export async function listSeatGroups(limit = 50): Promise<SeatGroup[]> {
  const { rows } = await pool.query<{ key: string }>(`SELECT key FROM rate_limits WHERE key LIKE 'seatcode:%'`);
  const groups = rows.map((r) => parseSeatMetaKey(r.key)?.group).filter((g): g is string => Boolean(g));
  const out: SeatGroup[] = [];
  for (const g of groups) {
    const info = await getSeatGroup(g);
    if (info) out.push(info);
  }
  return out.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)).slice(0, limit);
}

export type RedeemSeatResult = { ok: true; months: number } | { ok: false; error: string };

/**
 * Gives this user one seat of `group`: Pro for the code's months, added on
 * top of any Pro time they already have. One seat per person per code.
 */
export async function redeemSeat(userId: string, group: string): Promise<RedeemSeatResult> {
  const meta = await metaFor(group);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: mine } = await client.query(
      `SELECT 1 FROM beta_codes WHERE code LIKE $1 AND "usedByUserId" = $2 LIMIT 1`,
      [seatRowPattern(group), userId],
    );
    if (mine.length > 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "You've already used a seat from this code." };
    }
    const { rows: free } = await client.query(
      `SELECT id FROM beta_codes WHERE code LIKE $1 AND "isUsed" = false ORDER BY code LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [seatRowPattern(group)],
    );
    if (free.length === 0) {
      await client.query("ROLLBACK");
      const exists = await getSeatGroup(group);
      return {
        ok: false,
        error: exists
          ? "Every seat on this code has been used. Ask the person who gave it to you for another."
          : "That code isn't valid. Check it and try again.",
      };
    }
    const months = meta?.months ?? 3;
    await client.query(`UPDATE beta_codes SET "isUsed" = true, "usedByUserId" = $1, "usedAt" = now() WHERE id = $2`, [
      userId,
      free[0].id,
    ]);
    const updated = await client.query(
      `UPDATE users
          SET "isPro" = true,
              "proUntil" = GREATEST(COALESCE("proUntil", now()), now()) + make_interval(months => $2::int),
              "proPlan" = CASE WHEN "proPlan" = 'yearly' AND "proUntil" > now() THEN 'yearly' ELSE 'seat' END,
              "updatedAt" = now()
        WHERE id = $1`,
      [userId, months],
    );
    if (!updated.rowCount) throw new Error("user not found");
    await client.query("COMMIT");
    return { ok: true, months };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Switches off a code's unused seats (a refunded pack). Seats already
 * redeemed keep working: those people did nothing wrong.
 */
export async function disableUnusedSeats(group: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE beta_codes SET "isUsed" = true, "usedAt" = now() WHERE code LIKE $1 AND "isUsed" = false`,
    [seatRowPattern(group)],
  );
  return rowCount ?? 0;
}

export interface SeatUsageReport {
  group: string;
  label: string;
  seats: number;
  seatsUsed: number;
  /** People who checked at least one job in the last 14 days. */
  activeLast14Days: number;
  /** Jobs checked since each person redeemed. */
  checksRun: number;
  resumesTailored: number;
  proToolsUsed: number;
  firstRedeemedAt: Date | null;
}

/**
 * THE COHORT USAGE REPORT a pilot or licence buyer is promised: totals
 * only, across everyone who redeemed this code - never a person's name,
 * resume or results. Tailored resumes and Pro tools are counted from the
 * day usage tracking started (lib/usage.ts).
 */
export async function seatUsageReport(group: string): Promise<SeatUsageReport | null> {
  const info = await getSeatGroup(group);
  if (!info) return null;
  const { rows } = await pool.query(
    `WITH seats AS (
       SELECT "usedByUserId" AS uid, "usedAt" AS at
         FROM beta_codes
        WHERE code LIKE $1 AND "usedByUserId" IS NOT NULL
     )
     SELECT
       COUNT(*)::int AS used,
       MIN(s.at) AS first_at,
       COALESCE(SUM((SELECT COUNT(*) FROM jobs j WHERE j."userId" = s.uid AND j."createdAt" >= s.at)), 0)::int AS checks,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM jobs j WHERE j."userId" = s.uid AND j."createdAt" > now() - interval '14 days'
       ))::int AS active,
       COALESCE(SUM((SELECT count FROM rate_limits r WHERE r.key = 'usage:tailor:' || s.uid)), 0)::int AS tailored,
       COALESCE(SUM((SELECT count FROM rate_limits r WHERE r.key = 'usage:pro:' || s.uid)), 0)::int AS pro
     FROM seats s`,
    [seatRowPattern(group)],
  );
  const r = rows[0] ?? {};
  return {
    group,
    label: info.label,
    seats: info.seats - info.disabled,
    seatsUsed: Number(r.used ?? 0),
    activeLast14Days: Number(r.active ?? 0),
    checksRun: Number(r.checks ?? 0),
    resumesTailored: Number(r.tailored ?? 0),
    proToolsUsed: Number(r.pro ?? 0),
    firstRedeemedAt: r.first_at ? new Date(r.first_at) : null,
  };
}
