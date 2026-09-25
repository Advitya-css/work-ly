import { NextResponse } from "next/server";

import { pool } from "@/lib/db/pool";
import { runDiscovery } from "@/lib/discovery/run";
import { screenTopDiscovered } from "@/lib/discovery/deep-screen";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * THE NIGHTLY PRO CHECK - what makes the dashboard briefing true.
 *
 * For every Pro member with a target role: one smart discovery run, then
 * a full AI read of the top new matches, so the briefing opens on work
 * already done ("Last check 6 hours ago: 12 new listings, 5 read in
 * full"). Anyone who already had a run in the last 20 hours - their own,
 * or the yearly job watch's - is skipped, so nobody pays for two runs.
 *
 * Oldest-checked first, a few at a time, inside one 5-minute function.
 * At roughly 15-20 members per night this covers everyone while Pro is
 * small; past that, run it more often (Vercel Pro allows hourly crons) -
 * the 20-hour skip keeps each member to one check a day either way.
 */

const USERS_PER_RUN = 20;
const CONCURRENCY = 4;
const BUDGET_MS = 270_000;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  let checked = 0;
  let screened = 0;

  try {
    const { rows } = await pool.query(
      `SELECT u.id, MAX(r."startedAt") AS "lastRun"
         FROM users u
         JOIN career_goals cg ON cg."userId" = u.id AND cg.status = 'ACTIVE' AND cg."primaryTargetRole" IS NOT NULL
         LEFT JOIN discovery_runs r ON r."userId" = u.id
        WHERE u."isPro" = true
          AND (u."proUntil" IS NULL OR u."proUntil" > now())
        GROUP BY u.id
       HAVING MAX(r."startedAt") IS NULL OR MAX(r."startedAt") < now() - interval '20 hours'
        ORDER BY MAX(r."startedAt") ASC NULLS FIRST
        LIMIT $1`,
      [USERS_PER_RUN],
    );
    const userIds = rows.map((r) => r.id as string);

    for (let i = 0; i < userIds.length; i += CONCURRENCY) {
      // Leave room for the last batch to finish inside the function limit.
      if (Date.now() - started > BUDGET_MS - 70_000) break;
      await Promise.all(
        userIds.slice(i, i + CONCURRENCY).map(async (userId) => {
          try {
            await runDiscovery(userId, { limitPerSource: 12, aiScreenLimit: 4, timeBudgetMs: 30_000 });
            const result = await screenTopDiscovered(userId, { limit: 6, window: 12, budgetMs: 30_000 });
            screened += result.screened;
            checked++;
          } catch (error) {
            console.error(`[workly:pro-briefing] check failed for ${userId}:`, error);
          }
        }),
      );
    }

    return NextResponse.json({ success: true, due: userIds.length, checked, screened });
  } catch (error) {
    console.error("[workly:pro-briefing] cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
