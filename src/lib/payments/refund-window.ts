import "server-only";

import { pool } from "@/lib/db/pool";
import { BUSINESS } from "@/lib/business";

/**
 * THE LIGHT-USE MONEY-BACK GUARANTEE.
 *
 * A first purchase can be refunded within BUSINESS.refundDays, as long as
 * the buyer has used fewer than BUSINESS.refundUsageLimit Pro AI tools
 * (tailored resumes, cover letters, mock interviews, dream-job analyses...).
 * That keeps the guarantee honest for people trying Pro, without letting
 * someone run a whole job search on it and then ask for their money back -
 * Polar keeps its fee on a refund, and every AI call costs money.
 *
 * Stored in the rate_limits table (no migration needed):
 *   refund_first_<userId>   - marker that the user's first purchase happened
 *                             (never expires), so later purchases don't
 *                             reopen the guarantee
 *   refund_window_<userId>  - count = Pro AI uses since that purchase;
 *                             expires_at = end of the guarantee window
 */

const FIRST_KEY = (userId: string) => `refund_first_${userId}`;
const WINDOW_KEY = (userId: string) => `refund_window_${userId}`;

/** Opens the guarantee window on a user's first purchase. Safe to call on every grant. */
export async function openRefundWindow(userId: string, orderTimeIso: string): Promise<void> {
  const { rowCount } = await pool.query(
    `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 0, '2100-01-01T00:00:00Z')
     ON CONFLICT (key) DO NOTHING`,
    [FIRST_KEY(userId)],
  );
  if (!rowCount) return; // not the first purchase
  await pool.query(
    `INSERT INTO rate_limits (key, count, expires_at)
     VALUES ($1, 0, $2::timestamptz + make_interval(days => $3))
     ON CONFLICT (key) DO UPDATE SET count = 0, expires_at = EXCLUDED.expires_at`,
    [WINDOW_KEY(userId), orderTimeIso, BUSINESS.refundDays],
  );
}

/** Counts one Pro AI tool use toward the guarantee (only while a window is open). */
export async function recordProToolUse(userId: string): Promise<void> {
  await pool
    .query(`UPDATE rate_limits SET count = count + 1 WHERE key = $1 AND expires_at > now()`, [WINDOW_KEY(userId)])
    .catch(() => undefined);
}

export interface RefundStatus {
  /** Still inside the window and under the usage limit. */
  eligible: boolean;
  used: number;
  limit: number;
  /** When the window closes (or closed). Null when the user never bought. */
  until: Date | null;
}

export async function getRefundStatus(userId: string): Promise<RefundStatus | null> {
  const { rows } = await pool
    .query(`SELECT count, expires_at FROM rate_limits WHERE key = $1`, [WINDOW_KEY(userId)])
    .catch(() => ({ rows: [] as { count: number; expires_at: Date }[] }));
  const row = rows[0];
  if (!row) return null;
  const until = new Date(row.expires_at);
  const used = Number(row.count);
  const limit = BUSINESS.refundUsageLimit;
  return { eligible: until.getTime() > Date.now() && used < limit, used, limit, until };
}
