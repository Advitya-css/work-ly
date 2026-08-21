import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { Achievement, DataSource } from "./types";

function mapRow(row: Record<string, unknown>): Achievement {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    date: (row.date as Date | null) ?? null,
    source: row.source as DataSource,
    isUncertain: row.isUncertain as boolean,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listAchievementsByProfileId(careerProfileId: string): Promise<Achievement[]> {
  const { rows } = await pool.query(
    `SELECT * FROM achievements WHERE "careerProfileId" = $1 ORDER BY "date" DESC NULLS LAST, "createdAt" DESC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export async function getAchievementById(id: string): Promise<Achievement | null> {
  const { rows } = await pool.query(`SELECT * FROM achievements WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface AchievementInput {
  title: string;
  description?: string | null;
  date?: Date | null;
  source?: DataSource;
  isUncertain?: boolean;
}

export async function createAchievement(
  careerProfileId: string,
  input: AchievementInput,
): Promise<Achievement> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO achievements (id, "careerProfileId", title, description, date, source, "isUncertain", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING *`,
    [
      id,
      careerProfileId,
      input.title,
      input.description ?? null,
      input.date ?? null,
      input.source ?? "USER",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateAchievement(id: string, input: AchievementInput): Promise<Achievement> {
  const { rows } = await pool.query(
    `UPDATE achievements SET title = $2, description = $3, date = $4, "isUncertain" = false, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id, input.title, input.description ?? null, input.date ?? null],
  );
  return mapRow(rows[0]);
}

export async function deleteAchievement(id: string): Promise<void> {
  await pool.query(`DELETE FROM achievements WHERE id = $1`, [id]);
}
