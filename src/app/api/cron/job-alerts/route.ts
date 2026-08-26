import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { runDiscovery } from "@/lib/discovery/run";
import { sendJobAlertEmail } from "@/lib/email";

// Enable this endpoint to run for up to 5 minutes on Vercel Pro/Hobby limits
export const maxDuration = 300; 
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production this route MUST be locked down. Previously, when
  // CRON_SECRET was unset, the comparison below became
  // `authHeader !== "Bearer undefined"` - a literal string an attacker
  // could just send - which let anyone trigger mass job discovery and
  // force emails to every user with an active career goal. Now: no secret
  // configured in production means the route refuses every request
  // outright, instead of falling back to a guessable comparison.
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Outside production, only enforce the check if a secret was actually
    // set, so local testing without CRON_SECRET still works.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // The "Drip" method: Pull up to 15 PRO users who haven't had an alert in the last 7 days.
    const { rows } = await pool.query(`
      SELECT u.id, u.email, cg."primaryTargetRole"
      FROM users u
      JOIN career_goals cg ON cg."userId" = u.id
      WHERE cg.status = 'ACTIVE' 
        AND cg."primaryTargetRole" IS NOT NULL
        AND u."isPro" = true
        AND (u."lastAlertSentAt" IS NULL OR u."lastAlertSentAt" < NOW() - INTERVAL '7 days')
      LIMIT 50
    `);

    let emailsSent = 0;
    let totalNewJobs = 0;

    for (const row of rows) {
      const userId = row.id as string;
      const email = row.email as string;
      const targetRole = row.primaryTargetRole as string;

      try {
        const result = await runDiscovery(userId, { query: targetRole, limitPerSource: 20 });
        
        // We only email them if the algorithm flagged at least one of the new jobs as a STRONG match
        if (result.newHighPriority > 0) {
          await sendJobAlertEmail(email, targetRole, result.newJobs, result.newHighPriority);
          emailsSent++;
          totalNewJobs += result.newJobs;
        }
      } catch (err) {
        console.error(`[workly:cron] Failed discovery for user ${userId}:`, err);
      } finally {
        // Mark them as processed whether they succeeded, failed, or had 0 jobs,
        // so we don't get stuck in an infinite retry loop on the same user.
        await pool.query(`UPDATE users SET "lastAlertSentAt" = NOW() WHERE id = $1`, [userId]);
      }
    }

    return NextResponse.json({ success: true, usersProcessed: rows.length, emailsSent, totalNewJobs });
  } catch (error) {
    console.error("[workly:cron] Job alert cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
