import "server-only";
import { pool } from "@/lib/db/pool";

/**
 * When the user last changed anything a fit check reads: the profile row,
 * a skill, or a role. A job checked before this moment may say "no
 * matching skill" for something they've since added, so the job page
 * offers a re-check.
 */
export async function profileChangedAt(userId: string): Promise<Date | null> {
  try {
    const { rows } = await pool.query<{ at: Date | null }>(
      `SELECT GREATEST(
         cp."updatedAt",
         (SELECT MAX(s."updatedAt") FROM skills s WHERE s."careerProfileId" = cp.id),
         (SELECT MAX(e."updatedAt") FROM experiences e WHERE e."careerProfileId" = cp.id)
       ) AS at
       FROM career_profiles cp WHERE cp."userId" = $1`,
      [userId],
    );
    return rows[0]?.at ?? null;
  } catch {
    return null;
  }
}
