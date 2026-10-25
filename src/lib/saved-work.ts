import "server-only";

import { pool } from "@/lib/db/pool";
import { summaryWithin, type SavedKind } from "@/lib/saved-outputs";
import type { SavedWorkCounts } from "@/lib/saved-work-core";

export interface SavedWorkItem {
  opportunityId: string;
  title: string;
  company: string | null;
  kinds: SavedKind[];
}

/** Saved work with each job's name, for the panel on Home. Bounded like the summary it reads. */
export async function loadSavedWork(userId: string): Promise<{ counts: SavedWorkCounts; items: SavedWorkItem[] }> {
  const summary = await summaryWithin(userId);
  if (summary.jobs.length === 0) return { counts: summary.counts, items: [] };
  const ids = summary.jobs.slice(0, 8).map((j) => j.opportunityId);
  const { rows } = await pool
    .query<{ id: string; title: string | null; company: string | null }>(
      `SELECT o.id, j.title, j.company FROM opportunities o JOIN jobs j ON j.id = o."jobId"
        WHERE o."userId" = $1 AND o.id = ANY($2::text[])`,
      [userId, ids],
    )
    .catch(() => ({ rows: [] as { id: string; title: string | null; company: string | null }[] }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = summary.jobs
    .filter((j) => byId.has(j.opportunityId)) // a job deleted since keeps nothing worth showing
    .slice(0, 6)
    .map((j) => {
      const r = byId.get(j.opportunityId)!;
      return {
        opportunityId: j.opportunityId,
        title: (r.title ?? "Untitled role").replace(/^title:\s*/i, ""),
        company: r.company,
        kinds: j.kinds,
      };
    });
  return { counts: summary.counts, items };
}
