import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import { toArray } from "./array";
import type { CareerGoal, CareerGoalStatus, EmploymentType, SeniorityLevel, WorkMode } from "./types";

function mapRow(row: Record<string, unknown>): CareerGoal {
  return {
    id: row.id as string,
    userId: row.userId as string,
    title: row.title as string,
    targetRole: (row.targetRole as string | null) ?? null,
    targetIndustry: (row.targetIndustry as string | null) ?? null,
    timeframe: (row.timeframe as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as CareerGoalStatus,

    primaryTargetRole: (row.primaryTargetRole as string | null) ?? null,
    secondaryTargetRoles: toArray<string>(row.secondaryTargetRoles),
    industries: toArray<string>(row.industries),
    preferredLocations: toArray<string>(row.preferredLocations),
    countries: toArray<string>(row.countries),
    workModes: toArray<WorkMode>(row.workModes),
    employmentTypes: toArray<EmploymentType>(row.employmentTypes),
    seniority: (row.seniority as SeniorityLevel | null) ?? null,
    salaryMin: (row.salaryMin as number | null) ?? null,
    salaryMax: (row.salaryMax as number | null) ?? null,
    salaryCurrency: (row.salaryCurrency as string | null) ?? null,
    isUncertain: (row.isUncertain as boolean) ?? false,

    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

/** The goal job analysis should read preferences from - most recent active goal, or just the most recent one if none are active. */
export async function getPrimaryCareerGoal(userId: string): Promise<CareerGoal | null> {
  const { rows } = await pool.query(
    `SELECT * FROM career_goals WHERE "userId" = $1 ORDER BY (status = 'ACTIVE') DESC, "createdAt" DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listCareerGoalsByUserId(userId: string): Promise<CareerGoal[]> {
  const { rows } = await pool.query(
    `SELECT * FROM career_goals WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function getCareerGoalById(id: string): Promise<CareerGoal | null> {
  const { rows } = await pool.query(`SELECT * FROM career_goals WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface CareerGoalInput {
  title: string;
  targetRole?: string | null;
  targetIndustry?: string | null;
  timeframe?: string | null;
  notes?: string | null;
  status?: CareerGoalStatus;

  primaryTargetRole?: string | null;
  secondaryTargetRoles?: string[];
  industries?: string[];
  preferredLocations?: string[];
  countries?: string[];
  workModes?: WorkMode[];
  employmentTypes?: EmploymentType[];
  seniority?: SeniorityLevel | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  isUncertain?: boolean;
}

export async function createCareerGoal(userId: string, input: CareerGoalInput): Promise<CareerGoal> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO career_goals (
       id, "userId", title, "targetRole", "targetIndustry", timeframe, notes, status,
       "primaryTargetRole", "secondaryTargetRoles", industries, "preferredLocations", countries,
       "workModes", "employmentTypes", seniority, "salaryMin", "salaryMax", "salaryCurrency",
       "isUncertain", "updatedAt"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::"WorkMode"[], $15::"EmploymentType"[], $16, $17, $18, $19, $20, now())
     RETURNING *`,
    [
      id,
      userId,
      input.title,
      input.targetRole ?? null,
      input.targetIndustry ?? null,
      input.timeframe ?? null,
      input.notes ?? null,
      input.status ?? "ACTIVE",
      input.primaryTargetRole ?? null,
      input.secondaryTargetRoles ?? [],
      input.industries ?? [],
      input.preferredLocations ?? [],
      input.countries ?? [],
      input.workModes ?? [],
      input.employmentTypes ?? [],
      input.seniority ?? null,
      input.salaryMin ?? null,
      input.salaryMax ?? null,
      input.salaryCurrency ?? "USD",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateCareerGoal(id: string, input: CareerGoalInput): Promise<CareerGoal> {
  const { rows } = await pool.query(
    `UPDATE career_goals SET
       title = $2, "targetRole" = $3, "targetIndustry" = $4, timeframe = $5, notes = $6, status = $7,
       "primaryTargetRole" = $8, "secondaryTargetRoles" = $9, industries = $10, "preferredLocations" = $11,
       countries = $12, "workModes" = $13::"WorkMode"[], "employmentTypes" = $14::"EmploymentType"[], seniority = $15,
       "salaryMin" = $16, "salaryMax" = $17, "salaryCurrency" = $18, "isUncertain" = $19, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.title,
      input.targetRole ?? null,
      input.targetIndustry ?? null,
      input.timeframe ?? null,
      input.notes ?? null,
      input.status ?? "ACTIVE",
      input.primaryTargetRole ?? null,
      input.secondaryTargetRoles ?? [],
      input.industries ?? [],
      input.preferredLocations ?? [],
      input.countries ?? [],
      input.workModes ?? [],
      input.employmentTypes ?? [],
      input.seniority ?? null,
      input.salaryMin ?? null,
      input.salaryMax ?? null,
      input.salaryCurrency ?? "USD",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function deleteCareerGoal(id: string): Promise<void> {
  await pool.query(`DELETE FROM career_goals WHERE id = $1`, [id]);
}
