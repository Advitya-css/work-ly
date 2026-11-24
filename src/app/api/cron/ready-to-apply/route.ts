import { NextResponse } from "next/server";

import { pool } from "@/lib/db/pool";
import { prepareMorning } from "@/lib/morning/morning";
import { MORNING_LOOKBACK_DAYS, MORNING_MIN_FIT } from "@/lib/morning/morning-core";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * READY TO APPLY, EVERY MORNING.
 *
 * Runs after the nightly Pro check (cron/pro-briefing) has found and read
 * the night's listings. For each paying member with a listing that came
 * out as an "apply", it runs the full check and writes the resume, cover
 * letter and hiring-manager note, so Home opens on applications ready to
 * send. See lib/morning.
 *
 * Trial members are included, unlike the nightly check: waking up to
 * three applications already written is the clearest case for Pro there
 * is, and if the trial has ended by then the work waits for them, locked,
 * in their saved work.
 *
 * Only members with something worth writing for are picked, a few at a
 * time inside one 5-minute function. While Pro is small that covers
 * everyone each night; past about ten members with matches, run it more
 * often - a member whose listings were written for is not picked again,
 * because those listings are no longer unconverted.
 */

const USERS_PER_RUN = 12;
const CONCURRENCY = 3;
const BUDGET_MS = 280_000;
const PER_USER_MS = 80_000;

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
  let members = 0;
  let written = 0;
  let skipped = 0;

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT u.id
         FROM users u
         JOIN discovered_jobs d ON d."userId" = u.id
        WHERE u."isPro" = true
          AND (u."proUntil" IS NULL OR u."proUntil" > now())
          AND d."discoveredAt" >= now() - make_interval(days => $1)
          AND d."duplicateOfId" IS NULL
          AND d."isDismissed" = false
          AND d."convertedOpportunityId" IS NULL
          AND d.recommendation IN ('APPLY_NOW', 'APPLY')
          AND d."fitScore" >= $2
        LIMIT $3`,
      [MORNING_LOOKBACK_DAYS, MORNING_MIN_FIT, USERS_PER_RUN],
    );
    const userIds = rows.map((r) => r.id as string);

    for (let i = 0; i < userIds.length; i += CONCURRENCY) {
      // Leave room for the last batch to finish inside the function limit.
      if (Date.now() - started > BUDGET_MS - PER_USER_MS) break;
      await Promise.all(
        userIds.slice(i, i + CONCURRENCY).map(async (userId) => {
          try {
            const result = await prepareMorning(userId, { budgetMs: PER_USER_MS - 20_000 });
            written += result.written;
            skipped += result.skipped;
            members++;
          } catch (error) {
            console.error(`[workly:morning] failed for ${userId}:`, error);
          }
        }),
      );
    }

    return NextResponse.json({ success: true, due: userIds.length, members, written, skipped });
  } catch (error) {
    console.error("[workly:morning] cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
