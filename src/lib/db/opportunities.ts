import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { Opportunity, OpportunityStatus, PriorityBreakdown, RecommendationType } from "./types";

function mapRow(row: Record<string, unknown>): Opportunity {
  return {
    id: row.id as string,
    userId: row.userId as string,
    jobId: row.jobId as string,
    jobAnalysisId: (row.jobAnalysisId as string | null) ?? null,

    fitScore: row.fitScore as number,
    recommendation: row.recommendation as RecommendationType,
    competitiveness: row.competitiveness as Opportunity["competitiveness"],

    priorityScore: row.priorityScore as number,
    priorityBreakdown: row.priorityBreakdown as PriorityBreakdown,

    isSaved: row.isSaved as boolean,
    status: row.status as OpportunityStatus,

    discoveredAt: row.discoveredAt as Date,
    lastAnalyzedAt: row.lastAnalyzedAt as Date,

    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listOpportunitiesByUserId(userId: string): Promise<Opportunity[]> {
  const { rows } = await pool.query(
    `SELECT * FROM opportunities WHERE "userId" = $1 ORDER BY "discoveredAt" DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const { rows } = await pool.query(`SELECT * FROM opportunities WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getOpportunityByJobId(jobId: string): Promise<Opportunity | null> {
  const { rows } = await pool.query(`SELECT * FROM opportunities WHERE "jobId" = $1 LIMIT 1`, [jobId]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface OpportunitySnapshotInput {
  jobAnalysisId: string | null;
  fitScore: number;
  recommendation: RecommendationType;
  competitiveness: Opportunity["competitiveness"];
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
}

/**
 * Every analyzed job becomes (or re-syncs) an Opportunity. First analysis
 * creates the row with discoveredAt = now(); a re-analysis of the same job
 * only refreshes the scoring snapshot and lastAnalyzedAt - it never resets
 * discoveredAt, isSaved, or status, since those are the user's own state.
 */
export async function upsertOpportunityForJob(
  userId: string,
  jobId: string,
  input: OpportunitySnapshotInput,
): Promise<Opportunity> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO opportunities
       (id, "userId", "jobId", "jobAnalysisId", "fitScore", recommendation, competitiveness,
        "priorityScore", "priorityBreakdown", "lastAnalyzedAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now(), now())
     ON CONFLICT ("jobId") DO UPDATE SET
       "jobAnalysisId" = EXCLUDED."jobAnalysisId",
       "fitScore" = EXCLUDED."fitScore",
       recommendation = EXCLUDED.recommendation,
       competitiveness = EXCLUDED.competitiveness,
       "priorityScore" = EXCLUDED."priorityScore",
       "priorityBreakdown" = EXCLUDED."priorityBreakdown",
       "lastAnalyzedAt" = now(),
       "updatedAt" = now()
     RETURNING *`,
    [
      id,
      userId,
      jobId,
      input.jobAnalysisId,
      input.fitScore,
      input.recommendation,
      input.competitiveness,
      input.priorityScore,
      JSON.stringify(input.priorityBreakdown),
    ],
  );
  return mapRow(rows[0]);
}

export async function setOpportunitySaved(id: string, isSaved: boolean): Promise<Opportunity> {
  const { rows } = await pool.query(
    `UPDATE opportunities SET "isSaved" = $2, "updatedAt" = now() WHERE id = $1 RETURNING *`,
    [id, isSaved],
  );
  return mapRow(rows[0]);
}

export async function setOpportunityStatus(id: string, status: OpportunityStatus): Promise<Opportunity> {
  const { rows } = await pool.query(
    `UPDATE opportunities SET status = $2, "updatedAt" = now() WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return mapRow(rows[0]);
}

export async function deleteOpportunity(id: string): Promise<void> {
  await pool.query(`DELETE FROM opportunities WHERE id = $1`, [id]);
}
