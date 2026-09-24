import "server-only";

import { pool } from "@/lib/db/pool";
import type { AlertMatch } from "@/lib/email";

/**
 * The strong matches a discovery run just found, best first - what the
 * alert email names instead of a bare count. The reason line is the
 * grounded screen's verdict when there is one, otherwise the first stored
 * match reason.
 */
export async function newStrongMatches(userId: string, since: Date, limit = 3): Promise<AlertMatch[]> {
  const { rows } = await pool.query(
    `SELECT title, company, "fitScore", "matchReasons"
       FROM discovered_jobs
      WHERE "userId" = $1
        AND "discoveredAt" >= $2
        AND "duplicateOfId" IS NULL
        AND "isDismissed" = false
        AND recommendation IN ('APPLY_NOW', 'APPLY')
      ORDER BY "fitScore" DESC NULLS LAST
      LIMIT $3`,
    [userId, since, limit],
  );
  return rows.map((r) => {
    const reasons = Array.isArray(r.matchReasons) ? (r.matchReasons as { kind?: string; text?: string }[]) : [];
    const screen = reasons.find((m) => m.kind === "screen") ?? reasons.find((m) => m.kind === "skill");
    return {
      title: String(r.title),
      company: r.company ?? null,
      fitScore: typeof r.fitScore === "number" ? r.fitScore : null,
      reason: screen?.text ?? null,
    };
  });
}
