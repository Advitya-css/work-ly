import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { CandidateValueSignal, DataSource } from "./types";

function mapRow(row: Record<string, unknown>): CandidateValueSignal {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    value: row.value as string,
    confidence: Number(row.confidence),
    evidence: row.evidence as string,
    source: row.source as DataSource,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listCandidateValuesByProfileId(careerProfileId: string): Promise<CandidateValueSignal[]> {
  const { rows } = await pool.query(
    `SELECT * FROM candidate_value_signals WHERE "careerProfileId" = $1 ORDER BY confidence DESC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export interface CandidateValueInput {
  value: string;
  confidence: number;
  evidence: string;
  source?: DataSource;
}

export async function createCandidateValue(
  careerProfileId: string,
  input: CandidateValueInput,
): Promise<CandidateValueSignal> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO candidate_value_signals
       (id, "careerProfileId", value, confidence, evidence, source, "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING *`,
    [id, careerProfileId, input.value, input.confidence, input.evidence, input.source ?? "AI_INFERENCE"],
  );
  return mapRow(rows[0]);
}

/**
 * A fresh CV parse replaces the previous inference rather than adding to
 * it - values are a judgment about the whole document, not additive facts
 * like skills, so keeping stale rows from an earlier resume would let a
 * candidate's profile go on claiming "climate-focused" after they upload a
 * CV that no longer supports it at all.
 */
export async function replaceCandidateValues(
  careerProfileId: string,
  inputs: CandidateValueInput[],
): Promise<CandidateValueSignal[]> {
  await pool.query(`DELETE FROM candidate_value_signals WHERE "careerProfileId" = $1`, [careerProfileId]);
  return Promise.all(inputs.map((input) => createCandidateValue(careerProfileId, input)));
}
