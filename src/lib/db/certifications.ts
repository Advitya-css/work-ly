import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { Certification, DataSource } from "./types";

function mapRow(row: Record<string, unknown>): Certification {
  return {
    id: row.id as string,
    careerProfileId: row.careerProfileId as string,
    name: row.name as string,
    issuer: (row.issuer as string | null) ?? null,
    issueDate: (row.issueDate as Date | null) ?? null,
    expiryDate: (row.expiryDate as Date | null) ?? null,
    credentialUrl: (row.credentialUrl as string | null) ?? null,
    source: row.source as DataSource,
    isUncertain: row.isUncertain as boolean,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function listCertificationsByProfileId(
  careerProfileId: string,
): Promise<Certification[]> {
  const { rows } = await pool.query(
    `SELECT * FROM certifications WHERE "careerProfileId" = $1 ORDER BY "issueDate" DESC NULLS LAST, "createdAt" DESC`,
    [careerProfileId],
  );
  return rows.map(mapRow);
}

export async function getCertificationById(id: string): Promise<Certification | null> {
  const { rows } = await pool.query(`SELECT * FROM certifications WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface CertificationInput {
  name: string;
  issuer?: string | null;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  credentialUrl?: string | null;
  source?: DataSource;
  isUncertain?: boolean;
}

export async function createCertification(
  careerProfileId: string,
  input: CertificationInput,
): Promise<Certification> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO certifications
       (id, "careerProfileId", name, issuer, "issueDate", "expiryDate", "credentialUrl", source, "isUncertain", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     RETURNING *`,
    [
      id,
      careerProfileId,
      input.name,
      input.issuer ?? null,
      input.issueDate ?? null,
      input.expiryDate ?? null,
      input.credentialUrl ?? null,
      input.source ?? "USER",
      input.isUncertain ?? false,
    ],
  );
  return mapRow(rows[0]);
}

export async function updateCertification(
  id: string,
  input: CertificationInput,
): Promise<Certification> {
  const { rows } = await pool.query(
    `UPDATE certifications SET
       name = $2, issuer = $3, "issueDate" = $4, "expiryDate" = $5, "credentialUrl" = $6,
       "isUncertain" = false, "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name,
      input.issuer ?? null,
      input.issueDate ?? null,
      input.expiryDate ?? null,
      input.credentialUrl ?? null,
    ],
  );
  return mapRow(rows[0]);
}

export async function deleteCertification(id: string): Promise<void> {
  await pool.query(`DELETE FROM certifications WHERE id = $1`, [id]);
}
