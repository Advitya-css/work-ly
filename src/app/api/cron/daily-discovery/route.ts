import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { runDiscovery } from "@/lib/discovery/run";
import { getAdapter } from "@/lib/discovery/registry";
import { sendJobAlertEmail } from "@/lib/email";

export const maxDuration = 300; 
export const dynamic = "force-dynamic";

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

  try {
    // Feature 1: The silent background scraper.
    // Constantly hunts for jobs for active users (up to 20 a run to stay within Vercel limits).
    // It silently drops matches into the database so the "Top Picks" feed is always fresh.
    //
    // Shares "lastAlertSentAt" with /api/cron/job-alerts (the existing,
    // Pro-only, high-priority-gated alert cron) rather than keeping its own
    // cooldown column. That's deliberate: this cron is the broader, lower
    // bar "wake everyone up" version, and without a shared cooldown the two
    // crons could both email the same person on the same day. A 3-day gate
    // here keeps it frequent enough to be a real retention hook without
    // being the second email of the day for someone job-alerts already
    // reached this week.
    const { rows } = await pool.query(`
      SELECT u.id, u.email, cg."primaryTargetRole"
      FROM users u
      JOIN career_goals cg ON cg."userId" = u.id
      WHERE cg.status = 'ACTIVE'
        AND cg."primaryTargetRole" IS NOT NULL
        AND (u."lastAlertSentAt" IS NULL OR u."lastAlertSentAt" < NOW() - INTERVAL '3 days')
      ORDER BY RANDOM()
      LIMIT 20
    `);

    let usersProcessed = 0;
    let totalNewJobs = 0;

    for (const row of rows) {
      const userId = row.id as string;
      const targetRole = row.primaryTargetRole as string;
      const email = row.email as string;

      try {
        let userNewJobs = 0;
        let userHighPriority = 0;
        // Auto-provision keyless boards if they don't have them.
        //
        // This used to read and write a "adapterId" COLUMN, which
        // job_source_configs does not have - the adapter id lives inside the
        // `config` JSON (see ensureDefaultSourcesAction). The query threw for
        // every user, the per-user catch swallowed it, and this cron silently
        // processed nobody.
        const { rows: existingSources } = await pool.query(
          `SELECT config->>'adapterId' AS "adapterId" FROM job_source_configs WHERE "userId" = $1`,
          [userId],
        );
        const existingAdapterIds = new Set(existingSources.map((r) => r.adapterId as string | null));

        for (const adapterId of ["arbeitnow", "remotive", "jobicy"]) {
          const adapter = getAdapter(adapterId);
          if (adapter && !existingAdapterIds.has(adapterId)) {
            await pool.query(
              `INSERT INTO job_source_configs (id, "userId", name, kind, config, status, "legalBasis", "createdAt", "updatedAt")
               VALUES (gen_random_uuid(), $1, $2, $3::"JobSourceKind", $4::jsonb, 'ACTIVE', $5, NOW(), NOW())`,
              [userId, adapter.name, adapter.kind, JSON.stringify({ adapterId }), adapter.legalBasis],
            );
          }
        }

        // One smart run per user. With no query, runDiscovery searches the
        // user's own target role first plus AI-suggested adjacent titles
        // (see the SMART DEFAULT block in lib/discovery/run.ts) - it used to
        // be called once per suggested title here, which multiplied source
        // calls and, now that runs include an AI screen, AI cost by 4x.
        const result = await runDiscovery(userId, { limitPerSource: 10, aiScreenLimit: 6, timeBudgetMs: 40_000 });
        totalNewJobs += result.newJobs;
        userNewJobs += result.newJobs;
        userHighPriority += result.newHighPriority;

        if (userNewJobs > 0 && email) {
          await sendJobAlertEmail(email, targetRole, userNewJobs, userHighPriority);
          // Same column job-alerts uses, so whichever cron reaches this user
          // first starts both crons' cooldowns - see the comment above.
          await pool.query(`UPDATE users SET "lastAlertSentAt" = NOW() WHERE id = $1`, [userId]);
        }

        usersProcessed++;
      } catch (err) {
        console.error(`[workly:cron] Failed daily discovery for user ${userId}:`, err);
      }
    }

    return NextResponse.json({ success: true, usersProcessed, totalNewJobs });
  } catch (error) {
    console.error("[workly:cron] Daily discovery cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
