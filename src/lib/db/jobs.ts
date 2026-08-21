import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import { toArray } from "./array";
import type {
  EmploymentType,
  Job,
  JobInputMethod,
  JobStatus,
  RequirementItem,
  SeniorityLevel,
  WorkMode,
} from "./types";

function mapRow(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    userId: row.userId as string,
    inputMethod: row.inputMethod as JobInputMethod,
    url: (row.url as string | null) ?? null,
    rawInput: row.rawInput as string,
    status: row.status as JobStatus,
    errorMessage: (row.errorMessage as string | null) ?? null,

    title: (row.title as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    salaryMin: (row.salaryMin as number | null) ?? null,
    salaryMax: (row.salaryMax as number | null) ?? null,
    salaryCurrency: (row.salaryCurrency as string | null) ?? null,
    employmentType: (row.employmentType as EmploymentType | null) ?? null,
    workMode: (row.workMode as WorkMode | null) ?? null,
    seniority: (row.seniority as SeniorityLevel | null) ?? null,
    description: (row.description as string | null) ?? null,
    requiredExperienceYears: (row.requiredExperienceYears as number | null) ?? null,
    preferredExperienceYears: (row.preferredExperienceYears as number | null) ?? null,
    education: (row.education as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    deadline: (row.deadline as Date | null) ?? null,
    datePosted: (row.datePosted as Date | null) ?? null,
    source: (row.source as string | null) ?? null,

    requiredSkills: toArray<string>(row.requiredSkills),
    preferredSkills: toArray<string>(row.preferredSkills),
    requirements: (row.requirements as RequirementItem[] | null) ?? [],

    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listJobsByUserId(userId: string): Promise<Job[]> {
  const { rows } = await pool.query(`SELECT * FROM jobs WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [
    userId,
  ]);
  return rows.map(mapRow);
}

export async function getJobById(userId: string, id: string): Promise<Job | null> {
  const { rows } = await pool.query(`SELECT * FROM jobs WHERE id = $1 AND "userId" = $2 LIMIT 1`, [id, userId]);
  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * Finds a successfully-parsed job this user already submitted with exactly
 * this text. Used to avoid paying for a second AI parse of a posting the
 * user re-pasted - see submitParseAndAnalyzeJob.
 *
 * Compares trimmed text rather than a stored hash: the volume per user is
 * small (tens of rows), and an extra column would need backfilling for no
 * practical gain at this scale.
 */
export async function findParsedJobByRawInput(userId: string, rawInput: string): Promise<Job | null> {
  const { rows } = await pool.query(
    `SELECT * FROM jobs
      WHERE "userId" = $1 AND status = 'PARSED' AND btrim("rawInput") = btrim($2)
      ORDER BY "createdAt" DESC
      LIMIT 1`,
    [userId, rawInput],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createJob(
  userId: string,
  input: { inputMethod: JobInputMethod; url?: string | null; rawInput: string },
): Promise<Job> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO jobs (id, "userId", "inputMethod", url, "rawInput", status, "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'PARSING', now())
     RETURNING *`,
    [id, userId, input.inputMethod, input.url ?? null, input.rawInput],
  );
  return mapRow(rows[0]);
}

export interface JobParsedFields {
  title: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  seniority: SeniorityLevel | null;
  description: string | null;
  requiredExperienceYears: number | null;
  preferredExperienceYears: number | null;
  education: string | null;
  industry: string | null;
  deadline: Date | null;
  datePosted: Date | null;
  source: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: RequirementItem[];
}

export async function saveJobParseResult(id: string, fields: JobParsedFields): Promise<Job> {
  const { rows } = await pool.query(
    `UPDATE jobs SET
       status = 'PARSED', "errorMessage" = NULL,
       title = $2, company = $3, location = $4, country = $5,
       "salaryMin" = $6, "salaryMax" = $7, "salaryCurrency" = $8,
       "employmentType" = $9, "workMode" = $10, seniority = $11,
       description = $12, "requiredExperienceYears" = $13, "preferredExperienceYears" = $14,
       education = $15, industry = $16, deadline = $17, "datePosted" = $18, source = $19,
       "requiredSkills" = $20, "preferredSkills" = $21, requirements = $22::jsonb,
       "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      fields.title,
      fields.company,
      fields.location,
      fields.country,
      fields.salaryMin,
      fields.salaryMax,
      fields.salaryCurrency,
      fields.employmentType,
      fields.workMode,
      fields.seniority,
      fields.description,
      fields.requiredExperienceYears,
      fields.preferredExperienceYears,
      fields.education,
      fields.industry,
      fields.deadline,
      fields.datePosted,
      fields.source,
      fields.requiredSkills,
      fields.preferredSkills,
      JSON.stringify(fields.requirements),
    ],
  );
  return mapRow(rows[0]);
}

export async function markJobFailed(id: string, errorMessage: string): Promise<void> {
  await pool.query(`UPDATE jobs SET status = 'FAILED', "errorMessage" = $2, "updatedAt" = now() WHERE id = $1`, [
    id,
    errorMessage,
  ]);
}

export async function deleteJob(id: string): Promise<void> {
  await pool.query(`DELETE FROM jobs WHERE id = $1`, [id]);
}
