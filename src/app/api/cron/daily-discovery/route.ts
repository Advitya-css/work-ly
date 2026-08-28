import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { runDiscovery } from "@/lib/discovery/run";
import { suggestIdealJobSearches } from "@/lib/ai/providers/interest-titles";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { profileSearchText } from "@/lib/discovery/profile-text";

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
        // AI Proactive Scraping: instead of just searching for the generic targetRole,
        // we feed the user's entire profile to the AI and have it generate 3 highly
        // specific titles. This turns discovery into a proactive, intelligent agent.
        const profile = await getFullCareerProfile(userId);
        const text = profileSearchText(profile);
        
        const idealTitles = await suggestIdealJobSearches(text, targetRole);
        const queries = idealTitles.length > 0 ? idealTitles : [targetRole];
        
        // Auto-provision keyless boards if they don't have them
        const { rows: existingSources } = await pool.query(`SELECT "adapterId" FROM job_source_configs WHERE "userId" = $1`, [userId]);
        const existingAdapterIds = new Set(existingSources.map(r => r.adapterId));
        
        for (const adapterId of ["arbeitnow", "remotive", "jobicy"]) {
          if (!existingAdapterIds.has(adapterId)) {
            await pool.query(
              `INSERT INTO job_source_configs (id, "userId", "adapterId", name, kind, config, status, "legalBasis", "createdAt", "updatedAt")
               VALUES (gen_random_uuid(), $1, $2, $3, 'PUBLIC_JOB_BOARD', '{}', 'ACTIVE', 'Open API', NOW(), NOW())`,
              [userId, adapterId, adapterId.charAt(0).toUpperCase() + adapterId.slice(1)]
            );
          }
        }

        // Run discovery on all smart queries!
        for (const q of queries) {
          const result = await runDiscovery(userId, { query: q, limitPerSource: 10 });
          totalNewJobs += result.newJobs;
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
