import "server-only";

import { pool } from "@/lib/db/pool";
import { roleKey } from "@/lib/discovery/hidden-roles-core";

/**
 * Every role this person has said they're done with: listings they marked
 * "Already applied" or "Not for me", applications they've logged past the
 * "saved" stage, and opportunities marked applied. See hidden-roles-core.ts.
 * Never throws: if it can't be read, nothing extra is hidden.
 */
export async function listHiddenRoleKeys(userId: string): Promise<Set<string>> {
  const keys = new Set<string>();
  try {
    const { rows } = await pool.query<{ company: string | null; title: string | null }>(
      `SELECT company, title FROM discovered_jobs WHERE "userId" = $1 AND "isDismissed" = true
       UNION
       SELECT company, "roleTitle" AS title FROM applications WHERE "userId" = $1 AND status <> 'SAVED'
       UNION
       SELECT j.company, j.title FROM opportunities o JOIN jobs j ON j.id = o."jobId"
        WHERE o."userId" = $1 AND o.status = 'APPLIED'`,
      [userId],
    );
    for (const r of rows) {
      const key = roleKey(r.company, r.title);
      if (key) keys.add(key);
    }
  } catch (error) {
    console.warn("[workly:discovery] couldn't read hidden roles:", error instanceof Error ? error.message : error);
  }
  return keys;
}

/** Hides every stored listing of this role (all boards, all reposts). Returns how many. */
export async function hideRoleListings(userId: string, company: string | null, title: string): Promise<number> {
  const key = roleKey(company, title);
  if (!key) return 0;
  const { rows } = await pool.query<{ id: string; company: string | null; title: string }>(
    `SELECT id, company, title FROM discovered_jobs WHERE "userId" = $1 AND "isDismissed" = false`,
    [userId],
  );
  const ids = rows.filter((r) => roleKey(r.company, r.title) === key).map((r) => r.id);
  if (ids.length === 0) return 0;
  await pool.query(
    `UPDATE discovered_jobs SET "isDismissed" = true, "updatedAt" = now() WHERE "userId" = $1 AND id = ANY($2::text[])`,
    [userId, ids],
  );
  return ids.length;
}
