import { NextResponse } from "next/server";

import { pool } from "@/lib/db/pool";
import { runDiscovery } from "@/lib/discovery/run";
import { screenTopDiscovered } from "@/lib/discovery/deep-screen";
import { sendJobWatchEmail, type AlertMatch } from "@/lib/email";
import { dreamJobsDueForRecheck } from "@/lib/db/readiness-snapshots";
import { recheckReadiness } from "@/lib/insights/progress";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const WATCH_USERS_PER_RUN = 6;
const RECHECKS_PER_RUN = 6;
const CONCURRENCY = 3;

/**
 * THE YEARLY PERKS' DAILY JOB.
 *
 * 1. Always-on job watch: for yearly members who switched it on, one smart
 *    discovery run plus a full read of the top matches, then an email ONLY
 *    if something new clears their bar (Candidate Fit 85+ by default).
 *    Silence is the feature - it has to be rare to be trusted.
 * 2. Progress tracker: re-scores dream-job readiness for yearly members
 *    whose last check is over 30 days old, so the chart keeps moving.
 *
 * Users are processed a few at a time and rotated by lastWatchAt, so a
 * 5-minute function budget covers everyone over successive days.
 */
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(
      items.slice(i, i + size).map((item) => fn(item).catch((error) => console.error("[workly:watch]", error))),
    );
  }
}

async function exceptionalMatches(userId: string, since: Date, minFit: number): Promise<AlertMatch[]> {
  const { rows } = await pool.query(
    `SELECT title, company, "fitScore", "fitCoverage", "matchReasons"
       FROM discovered_jobs
      WHERE "userId" = $1
        AND "discoveredAt" >= $2
        AND "duplicateOfId" IS NULL
        AND "isDismissed" = false
        AND recommendation IN ('APPLY_NOW', 'APPLY')
        AND "fitScore" >= $3
      ORDER BY "fitScore" DESC
      LIMIT 5`,
    [userId, since, minFit],
  );
  return rows
    .filter((r) => r.fitCoverage == null || Number(r.fitCoverage) >= MIN_COVERAGE_FOR_SCORE)
    .map((r) => {
      const reasons = Array.isArray(r.matchReasons) ? (r.matchReasons as { kind?: string; text?: string }[]) : [];
      const reason = reasons.find((m) => m.kind === "screen") ?? reasons.find((m) => m.kind === "skill");
      return { title: String(r.title), company: r.company ?? null, fitScore: Number(r.fitScore), reason: reason?.text ?? null };
    });
}

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

  let watched = 0;
  let emailed = 0;
  let rechecked = 0;

  try {
    // Before the yearly-perks migration these columns don't exist; the
    // query throws and the watch simply does nothing yet.
    const { rows: users } = await pool
      .query(
        `SELECT id, email, "watchMinFit"
           FROM users
          WHERE "watchEnabled" = true
            AND "isPro" = true
            AND ("proUntil" IS NULL OR "proUntil" > now())
            AND "proPlan" IN ('yearly', 'beta')
            AND ("lastWatchAt" IS NULL OR "lastWatchAt" < now() - interval '20 hours')
          ORDER BY "lastWatchAt" ASC NULLS FIRST
          LIMIT $1`,
        [WATCH_USERS_PER_RUN],
      )
      .catch(() => ({ rows: [] as { id: string; email: string; watchMinFit: number }[] }));

    await inBatches(users, CONCURRENCY, async (user) => {
      const userId = user.id as string;
      const minFit = Number(user.watchMinFit ?? 85);
      try {
        const run = await runDiscovery(userId, { limitPerSource: 15, aiScreenLimit: 6, timeBudgetMs: 40_000 });
        await screenTopDiscovered(userId, { limit: 8, window: 12, budgetMs: 40_000 });
        const matches = await exceptionalMatches(userId, run.startedAt, minFit);
        if (matches.length > 0 && user.email) {
          await sendJobWatchEmail(user.email, matches, minFit);
          emailed++;
        }
        watched++;
      } finally {
        await pool.query(`UPDATE users SET "lastWatchAt" = now() WHERE id = $1`, [userId]).catch(() => undefined);
      }
    });

    const due = await dreamJobsDueForRecheck(30, RECHECKS_PER_RUN);
    await inBatches(due, CONCURRENCY, async ({ userId, dreamJobId }) => {
      const score = await recheckReadiness(userId, dreamJobId);
      if (score != null) rechecked++;
    });

    return NextResponse.json({ success: true, watched, emailed, rechecked });
  } catch (error) {
    console.error("[workly:watch] cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
