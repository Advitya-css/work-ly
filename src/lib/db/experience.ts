import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { DataSource, Experience } from "./types";

function mapRow(row: Record<string, unknown>): Experience {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    company: row.company as string,
    title: row.title as string,
    location: (row.location as string | null) ?? null,
    startDate: (row.startDate as Date | null) ?? null,
    endDate: (row.endDate as Date | null) ?? null,
    isCurrent: row.isCurrent as boolean,
    description: (row.description as string | null) ?? null,
    source: row.source as DataSource,
    isUncertain: row.isUncertain as boolean,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listExperienceByProfileId(careerProfileId: string): Promise<Experience[]> {
  const { rows } = await pool.query(
    `SELECT * FROM experiences WHERE "careerProfileId" = $1 ORDER BY "isCurrent" DESC, "startDate" DESC NULLS LAST, "createdAt" DESC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export async function getExperienceById(id: string): Promise<Experience | null> {
  const { rows } = await pool.query(`SELECT * FROM experiences WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface ExperienceInput {
  company: string;
  title: string;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isCurrent?: boolean;
  description?: string | null;
  source?: DataSource;
  isUncertain?: boolean;
}

export async function createExperience(
  careerProfileId: string,
  input: ExperienceInput,
): Promise<Experience> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO experiences
       (id, "careerProfileId", company, title, location, "startDate", "endDate", "isCurrent", description, source, "isUncertain", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     RETURNING *`,
    [
      id,
      careerProfileId,
      input.company,
      input.title,
      input.location ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.isCurrent ?? false,
      input.description ?? null,
      input.source ?? "USER",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateExperience(id: string, input: ExperienceInput): Promise<Experience> {
  const { rows } = await pool.query(
    `UPDATE experiences SET
       company = $2, title = $3, location = $4, "startDate" = $5, "endDate" = $6,
       "isCurrent" = $7, description = $8, "isUncertain" = false, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.company,
      input.title,
      input.location ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.isCurrent ?? false,
      input.description ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function deleteExperience(id: string): Promise<void> {
  await pool.query(`DELETE FROM experiences WHERE id = $1`, [id]);
}
