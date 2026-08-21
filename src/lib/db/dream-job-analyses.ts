import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type {
  CvImprovement,
  DreamJobAnalysis,
  GapItem,
  GapPriority,
  ImprovementPlanItem,
  KeepItem,
  ProjectRecommendation,
  RequirementCheck,
  ScoreBreakdown,
} from "./types";

function mapRow(row: Record<string, unknown>): DreamJobAnalysis {
  return {
    id: row.id as string,
    userId: row.userId as string,
    dreamJobId: row.dreamJobId as string,

    readinessScore: row.readinessScore as number,
    competitiveness: row.competitiveness as DreamJobAnalysis["competitiveness"],
    scoreBreakdown: row.scoreBreakdown as ScoreBreakdown,

    strengths: (row.strengths as string[] | null) ?? [],
    weaknesses: (row.weaknesses as string[] | null) ?? [],
    gaps: (row.gaps as GapItem[] | null) ?? [],

    mandatoryRequirements: (row.mandatoryRequirements as RequirementCheck[] | null) ?? [],
    preferredRequirements: (row.preferredRequirements as RequirementCheck[] | null) ?? [],

    gapPriorities: (row.gapPriorities as GapPriority[] | null) ?? [],
    cvImprovements: (row.cvImprovements as CvImprovement[] | null) ?? [],
    keepAsIs: (row.keepAsIs as KeepItem[] | null) ?? [],
    improvementPlan: (row.improvementPlan as ImprovementPlanItem[] | null) ?? [],
    projectRecommendations: (row.projectRecommendations as ProjectRecommendation[] | null) ?? [],
    biggestObstacles: (row.biggestObstacles as string[] | null) ?? [],
    highestImpactNextStep: row.highestImpactNextStep as string,

    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function getDreamJobAnalysisByDreamJobId(dreamJobId: string): Promise<DreamJobAnalysis | null> {
  const { rows } = await pool.query(`SELECT * FROM dream_job_analyses WHERE "dreamJobId" = $1 LIMIT 1`, [
    dreamJobId,
  ]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getDreamJobAnalysisById(id: string): Promise<DreamJobAnalysis | null> {
  const { rows } = await pool.query(`SELECT * FROM dream_job_analyses WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface DreamJobAnalysisInput {
  readinessScore: number;
  competitiveness: DreamJobAnalysis["competitiveness"];
  scoreBreakdown: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  gaps: GapItem[];
  mandatoryRequirements: RequirementCheck[];
  preferredRequirements: RequirementCheck[];
  gapPriorities: GapPriority[];
  cvImprovements: CvImprovement[];
  keepAsIs: KeepItem[];
  improvementPlan: ImprovementPlanItem[];
  projectRecommendations: ProjectRecommendation[];
  biggestObstacles: string[];
  highestImpactNextStep: string;
}

/** Upsert-by-dreamJobId - re-analyzing a dream job replaces the prior analysis rather than accumulating duplicates. */
export async function saveDreamJobAnalysis(
  userId: string,
  dreamJobId: string,
  input: DreamJobAnalysisInput,
): Promise<DreamJobAnalysis> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO dream_job_analyses (
       id, "userId", "dreamJobId", "readinessScore", competitiveness, "scoreBreakdown",
       strengths, weaknesses, gaps, "mandatoryRequirements", "preferredRequirements",
       "gapPriorities", "cvImprovements", "keepAsIs", "improvementPlan", "projectRecommendations",
       "biggestObstacles", "highestImpactNextStep", "updatedAt"
     )
     VALUES (
       $1, $2, $3, $4, $5, $6::jsonb,
       $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb,
       $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb,
       $17::jsonb, $18, now()
     )
     ON CONFLICT ("dreamJobId") DO UPDATE SET
       "readinessScore" = EXCLUDED."readinessScore",
       competitiveness = EXCLUDED.competitiveness,
       "scoreBreakdown" = EXCLUDED."scoreBreakdown",
       strengths = EXCLUDED.strengths,
       weaknesses = EXCLUDED.weaknesses,
       gaps = EXCLUDED.gaps,
       "mandatoryRequirements" = EXCLUDED."mandatoryRequirements",
       "preferredRequirements" = EXCLUDED."preferredRequirements",
       "gapPriorities" = EXCLUDED."gapPriorities",
       "cvImprovements" = EXCLUDED."cvImprovements",
       "keepAsIs" = EXCLUDED."keepAsIs",
       "improvementPlan" = EXCLUDED."improvementPlan",
       "projectRecommendations" = EXCLUDED."projectRecommendations",
       "biggestObstacles" = EXCLUDED."biggestObstacles",
       "highestImpactNextStep" = EXCLUDED."highestImpactNextStep",
       "updatedAt" = now()
     RETURNING *`,
    [
      id,
      userId,
      dreamJobId,
      input.readinessScore,
      input.competitiveness,
      JSON.stringify(input.scoreBreakdown),
      JSON.stringify(input.strengths),
      JSON.stringify(input.weaknesses),
      JSON.stringify(input.gaps),
      JSON.stringify(input.mandatoryRequirements),
      JSON.stringify(input.preferredRequirements),
      JSON.stringify(input.gapPriorities),
      JSON.stringify(input.cvImprovements),
      JSON.stringify(input.keepAsIs),
      JSON.stringify(input.improvementPlan),
      JSON.stringify(input.projectRecommendations),
      JSON.stringify(input.biggestObstacles),
      input.highestImpactNextStep,
    ],
  );
  return mapRow(rows[0]);
}
