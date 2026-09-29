import "server-only";

import { pool } from "@/lib/db/pool";

/**
 * LIFETIME USAGE COUNTERS, per person - for the cohort usage reports a
 * pilot or licence buyer is promised (totals only, never anyone's content).
 *
 *   usage:pro:<userId>      Pro AI tools used (every tool that counts toward the refund rule)
 *   usage:tailor:<userId>   tailored resumes made
 *
 * rate_limits rows that never expire, so no migration. Never throws.
 */

export type UsageKind = "pro" | "tailor";

const FOREVER = "2100-01-01T00:00:00Z";

export async function recordUsage(userId: string, kind: UsageKind): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO rate_limits (key, count, expires_at) VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1`,
      [`usage:${kind}:${userId}`, FOREVER],
    );
  } catch (error) {
    console.warn("[workly:usage] could not record:", error instanceof Error ? error.message : error);
  }
}
