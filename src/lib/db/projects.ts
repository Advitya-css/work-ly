import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { DataSource, Project } from "./types";

function mapRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    name: row.name as string,
    role: (row.role as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    startDate: (row.startDate as Date | null) ?? null,
    endDate: (row.endDate as Date | null) ?? null,
    source: row.source as DataSource,
    isUncertain: row.isUncertain as boolean,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listProjectsByProfileId(careerProfileId: string): Promise<Project[]> {
  const { rows } = await pool.query(
    `SELECT * FROM projects WHERE "careerProfileId" = $1 ORDER BY "startDate" DESC NULLS LAST, "createdAt" DESC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { rows } = await pool.query(`SELECT * FROM projects WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface ProjectInput {
  name: string;
  role?: string | null;
  description?: string | null;
  url?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  source?: DataSource;
  isUncertain?: boolean;
}

export async function createProject(
  careerProfileId: string,
  input: ProjectInput,
): Promise<Project> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO projects
       (id, "careerProfileId", name, role, description, url, "startDate", "endDate", source, "isUncertain", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     RETURNING *`,
    [
      id,
      careerProfileId,
      input.name,
      input.role ?? null,
      input.description ?? null,
      input.url ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
      input.source ?? "USER",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { rows } = await pool.query(
    `UPDATE projects SET
       name = $2, role = $3, description = $4, url = $5, "startDate" = $6, "endDate" = $7,
       "isUncertain" = false, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name,
      input.role ?? null,
      input.description ?? null,
      input.url ?? null,
      input.startDate ?? null,
      input.endDate ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function deleteProject(id: string): Promise<void> {
  await pool.query(`DELETE FROM projects WHERE id = $1`, [id]);
}
