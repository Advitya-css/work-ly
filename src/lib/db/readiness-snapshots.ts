import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";

export interface ReadinessSnapshot {
  id: string;
  dreamJobId: string;
  readinessScore: number;
  coverage: number | null;
  source: "analysis" | "monthly" | string;
  stepsCompleted: number | null;
  createdAt: Date;
}

/*
 * The readiness_snapshots table arrives with the yearly-perks migration.
 * Everything here is best-effort so the app keeps working before it's
 * applied: writes are skipped and reads come back empty.
 */

export async function recordReadinessSnapshot(input: {
  userId: string;
  dreamJobId: string;
  readinessScore: number;
  coverage: number | null;
  source: "analysis" | "monthly";
  stepsCompleted: number | null;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO readiness_snapshots (id, "userId", "dreamJobId", "readinessScore", coverage, source, "stepsCompleted")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), input.userId, input.dreamJobId, Math.round(input.readinessScore), input.coverage, input.source, input.stepsCompleted],
    );
  } catch (error) {
    console.warn("[workly:progress] snapshot not recorded:", error instanceof Error ? error.message : error);
  }
}

export async function listReadinessSnapshots(userId: string, dreamJobId: string): Promise<ReadinessSnapshot[]> {
  try {
    const { rows } = await pool.query(
      `SELECT id, "dreamJobId", "readinessScore", coverage, source, "stepsCompleted", "createdAt"
         FROM readiness_snapshots
        WHERE "userId" = $1 AND "dreamJobId" = $2
        ORDER BY "createdAt" ASC
        LIMIT 60`,
      [userId, dreamJobId],
    );
    return rows.map((r) => ({
      id: r.id,
      dreamJobId: r.dreamJobId,
      readinessScore: Number(r.readinessScore),
      coverage: r.coverage == null ? null : Number(r.coverage),
      source: r.source,
      stepsCompleted: r.stepsCompleted == null ? null : Number(r.stepsCompleted),
      createdAt: new Date(r.createdAt),
    }));
  } catch {
    return [];
  }
}

/** Dream jobs owned by yearly members whose newest snapshot is older than `days` (or who have none). */
export async function dreamJobsDueForRecheck(days: number, limit: number): Promise<{ userId: string; dreamJobId: string }[]> {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (dj."userId") dj."userId", dj.id AS "dreamJobId"
         FROM dream_jobs dj
         JOIN users u ON u.id = dj."userId"
        WHERE dj.status = 'PARSED'
          AND u."isPro" = true
          AND (u."proUntil" IS NULL OR u."proUntil" > now())
          AND u."proPlan" IN ('yearly', 'beta')
          AND NOT EXISTS (
            SELECT 1 FROM readiness_snapshots s
             WHERE s."dreamJobId" = dj.id AND s."createdAt" > now() - make_interval(days => $1)
          )
        ORDER BY dj."userId", dj."createdAt" DESC
        LIMIT $2`,
      [days, limit],
    );
    return rows.map((r) => ({ userId: r.userId as string, dreamJobId: r.dreamJobId as string }));
  } catch (error) {
    console.warn("[workly:progress] recheck query failed:", error instanceof Error ? error.message : error);
    return [];
  }
}
