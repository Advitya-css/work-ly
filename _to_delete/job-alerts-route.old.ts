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
  
  // Only enforce CRON_SECRET if it's set (allows easy local testing)
  if ((process.env.NODE_ENV === "production" || cronSecret) && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all users who have an active career goal with a primary target role
    const { rows } = await pool.query(`
      SELECT u.id, u.email, cg."primaryTargetRole"
      FROM users u
      JOIN career_goals cg ON cg."userId" = u.id
      WHERE cg.status = 'ACTIVE' AND cg."primaryTargetRole" IS NOT NULL
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
      }
    }

    return NextResponse.json({ success: true, usersProcessed: rows.length, emailsSent, totalNewJobs });
  } catch (error) {
    console.error("[workly:cron] Job alert cron failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
