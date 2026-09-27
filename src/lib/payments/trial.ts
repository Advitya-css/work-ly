import "server-only";

import { pool } from "@/lib/db/pool";

/**
 * THE ONE-DAY PRO TRIAL.
 *
 * When an account's first resume is read, it gets Pro for 24 hours - enough
 * to feel a resume rewritten for a real job before being asked to pay. Once
 * per account, ever (the trial_used marker outlives the trial). It is not a
 * purchase: proPlan 'trial' keeps it out of the paid counts, the refund
 * window, the nightly Pro check and the follow-up emails' "paying" filter,
 * and TRIAL_TOOL_LIMIT caps its AI cost. When proUntil passes, the account
 * is simply free again (auth providers treat an expired proUntil as free).
 */

export const TRIAL_HOURS = 24;
/** Pro AI tools a trial may use in total. */
export const TRIAL_TOOL_LIMIT = 5;

export async function grantTrialIfEligible(userId: string): Promise<boolean> {
  try {
    const claim = await pool.query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, '2100-01-01T00:00:00Z')
       ON CONFLICT (key) DO NOTHING RETURNING key`,
      [`trial_used:${userId}`],
    );
    if (!claim.rowCount) return false;
    const { rowCount } = await pool.query(
      `UPDATE users
          SET "isPro" = true,
              "proUntil" = now() + make_interval(hours => $2),
              "proPlan" = 'trial',
              "updatedAt" = now()
        WHERE id = $1
          AND NOT ("isPro" = true AND ("proUntil" IS NULL OR "proUntil" > now()))`,
      [userId, TRIAL_HOURS],
    );
    if (rowCount) console.info(`[workly:trial] ${TRIAL_HOURS}h Pro trial started for ${userId}`);
    return Boolean(rowCount);
  } catch (error) {
    console.warn("[workly:trial] could not start trial:", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Whether this account is on a live trial right now. */
export async function onTrial(userId: string): Promise<boolean> {
  const { rows } = await pool
    .query(`SELECT 1 FROM users WHERE id = $1 AND "proPlan" = 'trial' AND "proUntil" > now()`, [userId])
    .catch(() => ({ rows: [] as unknown[] }));
  return rows.length > 0;
}
