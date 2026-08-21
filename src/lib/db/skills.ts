import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type {
  DataSource,
  Skill,
  SkillCategory,
  SkillEvidenceLevel,
  SkillExperienceLevel,
  SkillProficiency,
  SkillRecency,
} from "./types";

function mapRow(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    name: row.name as string,
    category: row.category as SkillCategory,
    proficiency: (row.proficiency as SkillProficiency | null) ?? null,
    experienceLevel: (row.experienceLevel as SkillExperienceLevel | null) ?? null,
    evidenceLevel: row.evidenceLevel as SkillEvidenceLevel,
    source: row.source as DataSource,
    recency: row.recency as SkillRecency,
    isTransferable: row.isTransferable as boolean,
    transferableRationale: (row.transferableRationale as string | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listSkillsByProfileId(careerProfileId: string): Promise<Skill[]> {
  const { rows } = await pool.query(
    `SELECT * FROM skills WHERE "careerProfileId" = $1 ORDER BY "isTransferable" ASC, category ASC, name ASC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export async function getSkillById(id: string): Promise<Skill | null> {
  const { rows } = await pool.query(`SELECT * FROM skills WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface SkillInput {
  name: string;
  category?: SkillCategory;
  proficiency?: SkillProficiency | null;
  experienceLevel?: SkillExperienceLevel | null;
  evidenceLevel?: SkillEvidenceLevel;
  source?: DataSource;
  recency?: SkillRecency;
  isTransferable?: boolean;
  transferableRationale?: string | null;
}

export async function createSkill(careerProfileId: string, input: SkillInput): Promise<Skill> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO skills
       (id, "careerProfileId", name, category, proficiency, "experienceLevel", "evidenceLevel", source, recency, "isTransferable", "transferableRationale", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     RETURNING *`,
    [
      id,
      careerProfileId,
      input.name,
      input.category ?? "OTHER",
      input.proficiency ?? null,
      input.experienceLevel ?? null,
      input.evidenceLevel ?? "STATED",
      input.source ?? "USER",
      input.recency ?? "UNKNOWN",
      input.isTransferable ?? false,
      input.transferableRationale ?? null,
    ],
  );
  return mapRow(rows[0]);
}

/** Edits always resolve to a user-confirmed, stated fact - a skill the user edited is no longer "just an AI inference". */
export async function updateSkill(id: string, input: SkillInput): Promise<Skill> {
  const { rows } = await pool.query(
    `UPDATE skills SET
       name = $2, category = $3, proficiency = $4, "experienceLevel" = $5, "evidenceLevel" = $6,
       recency = $7, "isTransferable" = $8, "transferableRationale" = $9, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name,
      input.category ?? "OTHER",
      input.proficiency ?? null,
      input.experienceLevel ?? null,
      input.evidenceLevel ?? "STATED",
      input.recency ?? "UNKNOWN",
      input.isTransferable ?? false,
      input.transferableRationale ?? null,
    ],
  );
  return mapRow(rows[0]);
}

/** Accepting a "potential transferable skill" turns it into a confirmed stated skill, per product principle #6. */
export async function acceptTransferableSkill(id: string): Promise<Skill> {
  const { rows } = await pool.query(
    `UPDATE skills SET "isTransferable" = false, "evidenceLevel" = 'STATED', "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  return mapRow(rows[0]);
}

export async function deleteSkill(id: string): Promise<void> {
  await pool.query(`DELETE FROM skills WHERE id = $1`, [id]);
}
