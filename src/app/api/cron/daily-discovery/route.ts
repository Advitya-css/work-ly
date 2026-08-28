import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { runDiscovery } from "@/lib/discovery/run";

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
    const { rows } = await pool.query(`
      SELECT u.id, cg."primaryTargetRole"
      FROM users u
      JOIN career_goals cg ON cg."userId" = u.id
      WHERE cg.status = 'ACTIVE' 
        AND cg."primaryTargetRole" IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 20
    `);

    let usersProcessed = 0;
    let totalNewJobs = 0;

    for (const row of rows) {
      const userId = row.id as string;
      const targetRole = row.primaryTargetRole as string;

      try {
        const result = await runDiscovery(userId, { query: targetRole, limitPerSource: 10 });
        usersProcessed++;
        totalNewJobs += result.newJobs;
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
