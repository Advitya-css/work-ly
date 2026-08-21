import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { DataSource, Education } from "./types";

function mapRow(row: Record<string, unknown>): Education {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    institution: row.institution as string,
    degree: (row.degree as string | null) ?? null,
    fieldOfStudy: (row.fieldOfStudy as string | null) ?? null,
    startDate: (row.startDate as Date | null) ?? null,
    endDate: (row.endDate as Date | null) ?? null,
    description: (row.description as string | null) ?? null,
    source: row.source as DataSource,
    isUncertain: row.isUncertain as boolean,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listEducationByProfileId(careerProfileId: string): Promise<Education[]> {
  const { rows } = await pool.query(
    `SELECT * FROM educations WHERE "careerProfileId" = $1 ORDER BY "startDate" DESC NULLS LAST, "createdAt" DESC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export async function getEducationById(id: string): Promise<Education | null> {
  const { rows } = await pool.query(`SELECT * FROM educations WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface EducationInput {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  description?: string | null;
  source?: DataSource;
  isUncertain?: boolean;
}

export async function createEducation(
  careerProfileId: string,
  input: EducationInput,
): Promise<Education> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO educations
       (id, "careerProfileId", institution, degree, "fieldOfStudy", "startDate", "endDate", description, source, "isUncertain", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     RETURNING *`,
    [
      id,
      careerProfileId,
      input.institution,
      input.degree ?? null,
      input.fieldOfStudy ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.description ?? null,
      input.source ?? "USER",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateEducation(id: string, input: EducationInput): Promise<Education> {
  const { rows } = await pool.query(
    `UPDATE educations SET
       institution = $2, degree = $3, "fieldOfStudy" = $4, "startDate" = $5, "endDate" = $6,
       description = $7, "isUncertain" = false, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.institution,
      input.degree ?? null,
      input.fieldOfStudy ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.description ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function deleteEducation(id: string): Promise<void> {
  await pool.query(`DELETE FROM educations WHERE id = $1`, [id]);
}
