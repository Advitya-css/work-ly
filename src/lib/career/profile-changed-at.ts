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

/**
 * When the skill matching last got smarter (word forms, every skill named).
 * A check from before then can say "no matching skill" for a skill that is
 * on the profile, so it's offered a re-check too.
 */
export const MATCHING_IMPROVED_AT = new Date("2026-10-30T00:00:00Z");

/** True when a fit check is older than the profile or the matching it used. */
export function checkIsOutdated(checkedAt: Date | string, changedAt: Date | null): boolean {
  const checked = new Date(checkedAt).getTime();
  if (checked < MATCHING_IMPROVED_AT.getTime()) return true;
  return Boolean(changedAt && changedAt.getTime() > checked + 1000);
}
