import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import { toArray } from "./array";
import type {
  DreamJob,
  DreamJobStatus,
  EmploymentType,
  RequirementItem,
  SeniorityLevel,
  WorkMode,
} from "./types";

function mapRow(row: Record<string, unknown>): DreamJob {
  return {
    id: row.id as string,
    userId: row.userId as string,

    dreamRole: row.dreamRole as string,
    companyName: (row.companyName as string | null) ?? null,
    portfolio: (row.portfolio as string | null) ?? null,
    rawInput: row.rawInput as string,

    status: row.status as DreamJobStatus,
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

export async function listDreamJobsByUserId(userId: string): Promise<DreamJob[]> {
  const { rows } = await pool.query(`SELECT * FROM dream_jobs WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [
    userId,
  ]);
  return rows.map(mapRow);
}

export async function getDreamJobById(id: string): Promise<DreamJob | null> {
  const { rows } = await pool.query(`SELECT * FROM dream_jobs WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface CreateDreamJobInput {
  dreamRole: string;
  companyName?: string | null;
  portfolio?: string | null;
  rawInput: string;
}

export async function createDreamJob(userId: string, input: CreateDreamJobInput): Promise<DreamJob> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO dream_jobs (id, "userId", "dreamRole", "companyName", portfolio, "rawInput", status, "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'PARSING', now())
     RETURNING *`,
    [id, userId, input.dreamRole, input.companyName ?? null, input.portfolio ?? null, input.rawInput],
  );
  return mapRow(rows[0]);
}

export interface DreamJobParsedFields {
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

export async function saveDreamJobParseResult(id: string, fields: DreamJobParsedFields): Promise<DreamJob> {
  const { rows } = await pool.query(
    `UPDATE dream_jobs SET
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

export async function markDreamJobFailed(id: string, errorMessage: string): Promise<void> {
  await pool.query(`UPDATE dream_jobs SET status = 'FAILED', "errorMessage" = $2, "updatedAt" = now() WHERE id = $1`, [
    id,
    errorMessage,
  ]);
}

export async function deleteDreamJob(id: string): Promise<void> {
  await pool.query(`DELETE FROM dream_jobs WHERE id = $1`, [id]);
}
