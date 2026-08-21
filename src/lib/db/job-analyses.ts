import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type {
  GapItem,
  JobAnalysis,
  RecommendationType,
  RequirementCheck,
  ScoreBreakdown,
} from "./types";

function mapRow(row: Record<string, unknown>): JobAnalysis {
  return {
    id: row.id as string,
    userId: row.userId as string,
    jobId: row.jobId as string,
    fitScore: row.fitScore as number,
    competitiveness: row.competitiveness as JobAnalysis["competitiveness"],
    recommendation: row.recommendation as RecommendationType,
    recommendationReasoning: row.recommendationReasoning as string,
    scoreBreakdown: row.scoreBreakdown as ScoreBreakdown,
    strengths: (row.strengths as string[] | null) ?? [],
    weaknesses: (row.weaknesses as string[] | null) ?? [],
    gaps: (row.gaps as GapItem[] | null) ?? [],
    mandatoryRequirements: (row.mandatoryRequirements as RequirementCheck[] | null) ?? [],
    preferredRequirements: (row.preferredRequirements as RequirementCheck[] | null) ?? [],
    risks: (row.risks as string[] | null) ?? [],
    improvements: (row.improvements as string[] | null) ?? [],
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function getJobAnalysisByJobId(jobId: string): Promise<JobAnalysis | null> {
  const { rows } = await pool.query(`SELECT * FROM job_analyses WHERE "jobId" = $1 LIMIT 1`, [jobId]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getJobAnalysisById(id: string): Promise<JobAnalysis | null> {
  const { rows } = await pool.query(`SELECT * FROM job_analyses WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listJobAnalysesByUserId(userId: string): Promise<JobAnalysis[]> {
  const { rows } = await pool.query(
    `SELECT * FROM job_analyses WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export interface JobAnalysisInput {
  fitScore: number;
  competitiveness: JobAnalysis["competitiveness"];
  recommendation: RecommendationType;
  recommendationReasoning: string;
  scoreBreakdown: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  gaps: GapItem[];
  mandatoryRequirements: RequirementCheck[];
  preferredRequirements: RequirementCheck[];
  risks: string[];
  improvements: string[];
}

/** Upsert-by-jobId - re-analyzing a job (e.g. after the profile changes) replaces the prior analysis rather than accumulating duplicates. */
export async function saveJobAnalysis(
  userId: string,
  jobId: string,
  input: JobAnalysisInput,
): Promise<JobAnalysis> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO job_analyses (
       id, "userId", "jobId", "fitScore", competitiveness, recommendation, "recommendationReasoning",
       "scoreBreakdown", strengths, weaknesses, gaps, "mandatoryRequirements", "preferredRequirements",
       risks, improvements, "updatedAt"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, now())
     ON CONFLICT ("jobId") DO UPDATE SET
       "fitScore" = EXCLUDED."fitScore",
       competitiveness = EXCLUDED.competitiveness,
       recommendation = EXCLUDED.recommendation,
       "recommendationReasoning" = EXCLUDED."recommendationReasoning",
       "scoreBreakdown" = EXCLUDED."scoreBreakdown",
       strengths = EXCLUDED.strengths,
       weaknesses = EXCLUDED.weaknesses,
       gaps = EXCLUDED.gaps,
       "mandatoryRequirements" = EXCLUDED."mandatoryRequirements",
       "preferredRequirements" = EXCLUDED."preferredRequirements",
       risks = EXCLUDED.risks,
       improvements = EXCLUDED.improvements,
       "updatedAt" = now()
     RETURNING *`,
    [
      id,
      userId,
      jobId,
      input.fitScore,
      input.competitiveness,
      input.recommendation,
      input.recommendationReasoning,
      JSON.stringify(input.scoreBreakdown),
      JSON.stringify(input.strengths),
      JSON.stringify(input.weaknesses),
      JSON.stringify(input.gaps),
      JSON.stringify(input.mandatoryRequirements),
      JSON.stringify(input.preferredRequirements),
      JSON.stringify(input.risks),
      JSON.stringify(input.improvements),
    ],
  );
  return mapRow(rows[0]);
}
