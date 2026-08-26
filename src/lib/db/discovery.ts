import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import { toArray } from "./array";
import type {
  DiscoveredJob,
  DiscoveryRun,
  DiscoveryRunStatus,
  EmploymentType,
  JobSourceConfig,
  JobSourceKind,
  JobSourceStatus,
  MatchReason,
  RecommendationType,
  RequirementItem,
  SeniorityLevel,
  WorkMode,
} from "./types";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapSource(row: Record<string, unknown>): JobSourceConfig {
  return {
    id: row.id as string,
    userId: row.userId as string,
    kind: row.kind as JobSourceKind,
    name: row.name as string,
    config: (row.config as Record<string, unknown> | null) ?? {},
    status: row.status as JobSourceStatus,
    errorMessage: (row.errorMessage as string | null) ?? null,
    legalBasis: row.legalBasis as string,
    lastRunAt: (row.lastRunAt as Date | null) ?? null,
    lastRunFoundCount: row.lastRunFoundCount as number,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

function mapJob(row: Record<string, unknown>): DiscoveredJob {
  return {
    id: row.id as string,
    userId: row.userId as string,
    sourceConfigId: (row.sourceConfigId as string | null) ?? null,

    sourceKind: row.sourceKind as JobSourceKind,
    sourceName: row.sourceName as string,
    sourceUrl: (row.sourceUrl as string | null) ?? null,
    externalId: row.externalId as string,
    discoveredAt: row.discoveredAt as Date,
    postedAt: (row.postedAt as Date | null) ?? null,

    title: row.title as string,
    company: (row.company as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    salaryMin: (row.salaryMin as number | null) ?? null,
    salaryMax: (row.salaryMax as number | null) ?? null,
    salaryCurrency: (row.salaryCurrency as string | null) ?? null,
    employmentType: (row.employmentType as EmploymentType | null) ?? null,
    workMode: (row.workMode as WorkMode | null) ?? null,
    seniority: (row.seniority as SeniorityLevel | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    requiredSkills: toArray<string>(row.requiredSkills),
    preferredSkills: toArray<string>(row.preferredSkills),
    requirements: (row.requirements as RequirementItem[] | null) ?? [],

    dedupeKey: row.dedupeKey as string,
    duplicateOfId: (row.duplicateOfId as string | null) ?? null,

    embedding: (row.embedding as number[] | null) ?? [],
    embeddingModel: (row.embeddingModel as string | null) ?? null,

    fitScore: (row.fitScore as number | null) ?? null,
    fitCoverage: (row.fitCoverage as number | null) ?? null,
    recommendation: (row.recommendation as RecommendationType | null) ?? null,
    matchReasons: (row.matchReasons as MatchReason[] | null) ?? [],
    discoveryReason: (row.discoveryReason as string | null) ?? null,

    isDismissed: row.isDismissed as boolean,
    convertedOpportunityId: (row.convertedOpportunityId as string | null) ?? null,

    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

function mapRun(row: Record<string, unknown>): DiscoveryRun {
  return {
    id: row.id as string,
    userId: row.userId as string,
    status: row.status as DiscoveryRunStatus,
    query: (row.query as string | null) ?? null,
    sourcesRun: row.sourcesRun as number,
    rawFound: row.rawFound as number,
    duplicatesFolded: row.duplicatesFolded as number,
    newJobs: row.newJobs as number,
    newHighPriority: row.newHighPriority as number,
    errorMessage: (row.errorMessage as string | null) ?? null,
    startedAt: row.startedAt as Date,
    completedAt: (row.completedAt as Date | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function listSourcesByUserId(userId: string): Promise<JobSourceConfig[]> {
  const { rows } = await pool.query(
    `SELECT * FROM job_source_configs WHERE "userId" = $1 ORDER BY "createdAt" ASC`,
    [userId],
  );
  return rows.map(mapSource);
}

export async function getSourceById(id: string): Promise<JobSourceConfig | null> {
  const { rows } = await pool.query(`SELECT * FROM job_source_configs WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapSource(rows[0]) : null;
}

export async function createSource(
  userId: string,
  input: {
    kind: JobSourceKind;
    name: string;
    config: Record<string, unknown>;
    legalBasis: string;
    status?: JobSourceStatus;
  },
): Promise<JobSourceConfig> {
  const { rows } = await pool.query(
    `INSERT INTO job_source_configs (id, "userId", kind, name, config, "legalBasis", status, "updatedAt")
     VALUES ($1, $2, $3::"JobSourceKind", $4, $5::jsonb, $6, $7::"JobSourceStatus", now())
     RETURNING *`,
    [
      randomUUID(),
      userId,
      input.kind,
      input.name,
      JSON.stringify(input.config),
      input.legalBasis,
      input.status ?? "ACTIVE",
    ],
  );
  return mapSource(rows[0]);
}

export async function updateSourceStatus(
  id: string,
  update: { status: JobSourceStatus; errorMessage?: string | null; foundCount?: number },
): Promise<void> {
  await pool.query(
    `UPDATE job_source_configs SET
       status = $2::"JobSourceStatus",
       "errorMessage" = $3,
       "lastRunAt" = now(),
       "lastRunFoundCount" = COALESCE($4, "lastRunFoundCount"),
       "updatedAt" = now()
     WHERE id = $1`,
    [id, update.status, update.errorMessage ?? null, update.foundCount ?? null],
  );
}

export async function setSourceEnabled(id: string, enabled: boolean): Promise<void> {
  await pool.query(
    `UPDATE job_source_configs SET status = $2::"JobSourceStatus", "updatedAt" = now() WHERE id = $1`,
    [id, enabled ? "ACTIVE" : "DISABLED"],
  );
}

export async function deleteSource(id: string): Promise<void> {
  await pool.query(`DELETE FROM job_source_configs WHERE id = $1`, [id]);
}

// ---------------------------------------------------------------------------
// Discovered jobs
// ---------------------------------------------------------------------------

export async function listDiscoveredJobsByUserId(userId: string): Promise<DiscoveredJob[]> {
  const { rows } = await pool.query(
    `SELECT * FROM discovered_jobs WHERE "userId" = $1 ORDER BY "discoveredAt" DESC LIMIT 300`,
    [userId],
  );
  return rows.map(mapJob);
}

export async function getDiscoveredJobById(id: string): Promise<DiscoveredJob | null> {
  const { rows } = await pool.query(`SELECT * FROM discovered_jobs WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapJob(rows[0]) : null;
}

export interface UpsertDiscoveredJobInput {
  sourceConfigId: string | null;
  sourceKind: JobSourceKind;
  sourceName: string;
  sourceUrl: string | null;
  externalId: string;
  postedAt: Date | null;
  title: string;
  company: string | null;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  seniority: SeniorityLevel | null;
  industry: string | null;
  description: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: RequirementItem[];
  dedupeKey: string;
  duplicateOfId: string | null;
  embedding: number[] | null;
  embeddingModel: string | null;
  fitScore: number | null;
  fitCoverage: number | null;
  recommendation: RecommendationType | null;
  matchReasons: MatchReason[];
  discoveryReason: string | null;
}

/**
 * Upsert on (userId, externalId, sourceName). Re-running discovery
 * refreshes a listing's scoring and provenance without duplicating it, and
 * without resetting the user's own state (isDismissed, conversion).
 */
export async function upsertDiscoveredJob(
  userId: string,
  input: UpsertDiscoveredJobInput,
): Promise<{ job: DiscoveredJob; isNew: boolean }> {
  const { rows } = await pool.query(
    `INSERT INTO discovered_jobs (
       id, "userId", "sourceConfigId", "sourceKind", "sourceName", "sourceUrl", "externalId",
       "postedAt", title, company, location, country,
       "salaryMin", "salaryMax", "salaryCurrency",
       "employmentType", "workMode", seniority, industry, description,
       "requiredSkills", "preferredSkills", requirements,
       "dedupeKey", "duplicateOfId", embedding, "embeddingModel",
       "fitScore", "fitCoverage", recommendation, "matchReasons", "discoveryReason", "updatedAt"
     )
     VALUES (
       $1, $2, $3, $4::"JobSourceKind", $5, $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, $15,
       $16::"EmploymentType", $17::"WorkMode", $18::"SeniorityLevel", $19, $20,
       $21, $22, $23::jsonb,
       $24, $25, $26, $27,
       $28, $29, $30::"RecommendationType", $31::jsonb, $32, now()
     )
     ON CONFLICT ("userId", "externalId", "sourceName") DO UPDATE SET
       "sourceUrl" = EXCLUDED."sourceUrl",
       "postedAt" = EXCLUDED."postedAt",
       title = EXCLUDED.title,
       company = EXCLUDED.company,
       location = EXCLUDED.location,
       country = EXCLUDED.country,
       "salaryMin" = EXCLUDED."salaryMin",
       "salaryMax" = EXCLUDED."salaryMax",
       "salaryCurrency" = EXCLUDED."salaryCurrency",
       "employmentType" = EXCLUDED."employmentType",
       "workMode" = EXCLUDED."workMode",
       seniority = EXCLUDED.seniority,
       industry = EXCLUDED.industry,
       description = EXCLUDED.description,
       "requiredSkills" = EXCLUDED."requiredSkills",
       "preferredSkills" = EXCLUDED."preferredSkills",
       requirements = EXCLUDED.requirements,
       "dedupeKey" = EXCLUDED."dedupeKey",
       "duplicateOfId" = EXCLUDED."duplicateOfId",
       embedding = EXCLUDED.embedding,
       "embeddingModel" = EXCLUDED."embeddingModel",
       "fitScore" = EXCLUDED."fitScore",
       "fitCoverage" = EXCLUDED."fitCoverage",
       recommendation = EXCLUDED.recommendation,
       "matchReasons" = EXCLUDED."matchReasons",
       "discoveryReason" = EXCLUDED."discoveryReason",
       "updatedAt" = now()
     RETURNING *, (xmax = 0) AS inserted`,
    [
      randomUUID(),
      userId,
      input.sourceConfigId,
      input.sourceKind,
      input.sourceName,
      input.sourceUrl,
      input.externalId,
      input.postedAt,
      input.title,
      input.company,
      input.location,
      input.country,
      input.salaryMin,
      input.salaryMax,
      input.salaryCurrency,
      input.employmentType,
      input.workMode,
      input.seniority,
      input.industry,
      input.description,
      input.requiredSkills,
      input.preferredSkills,
      JSON.stringify(input.requirements),
      input.dedupeKey,
      input.duplicateOfId,
      input.embedding,
      input.embeddingModel,
      input.fitScore,
      input.fitCoverage,
      input.recommendation,
      JSON.stringify(input.matchReasons),
      input.discoveryReason,
    ],
  );
  // xmax = 0 identifies a genuine INSERT rather than an UPDATE, which is
  // how "new since last run" stays accurate across re-runs.
  return { job: mapJob(rows[0]), isNew: rows[0].inserted === true };
}

export async function setDiscoveredJobDismissed(id: string, dismissed: boolean): Promise<void> {
  await pool.query(
    `UPDATE discovered_jobs SET "isDismissed" = $2, "updatedAt" = now() WHERE id = $1`,
    [id, dismissed],
  );
}

export async function setDiscoveredJobConverted(id: string, opportunityId: string): Promise<void> {
  await pool.query(
    `UPDATE discovered_jobs SET "convertedOpportunityId" = $2, "updatedAt" = now() WHERE id = $1`,
    [id, opportunityId],
  );
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function createRun(userId: string, query: string | null): Promise<DiscoveryRun> {
  const { rows } = await pool.query(
    `INSERT INTO discovery_runs (id, "userId", query) VALUES ($1, $2, $3) RETURNING *`,
    [randomUUID(), userId, query],
  );
  return mapRun(rows[0]);
}

export async function completeRun(
  id: string,
  stats: {
    status: DiscoveryRunStatus;
    sourcesRun: number;
    rawFound: number;
    duplicatesFolded: number;
    newJobs: number;
    newHighPriority: number;
    errorMessage?: string | null;
  },
): Promise<DiscoveryRun> {
  const { rows } = await pool.query(
    `UPDATE discovery_runs SET
       status = $2::"DiscoveryRunStatus",
       "sourcesRun" = $3,
       "rawFound" = $4,
       "duplicatesFolded" = $5,
       "newJobs" = $6,
       "newHighPriority" = $7,
       "errorMessage" = $8,
       "completedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      stats.status,
      stats.sourcesRun,
      stats.rawFound,
      stats.duplicatesFolded,
      stats.newJobs,
      stats.newHighPriority,
      stats.errorMessage ?? null,
    ],
  );
  return mapRun(rows[0]);
}

export async function getLatestRun(userId: string): Promise<DiscoveryRun | null> {
  const { rows } = await pool.query(
    `SELECT * FROM discovery_runs WHERE "userId" = $1 ORDER BY "startedAt" DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapRun(rows[0]) : null;
}
