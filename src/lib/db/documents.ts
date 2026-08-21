import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { Document } from "./types";

function mapRow(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    userId: row.userId as string,
    fileName: row.fileName as string,
    fileType: row.fileType as Document["fileType"],
    fileSizeBytes: row.fileSizeBytes as number,
    storageKey: row.storageKey as string,
    status: row.status as Document["status"],
    errorMessage: (row.errorMessage as string | null) ?? null,
    uploadedAt: row.uploadedAt as Date,
    parsedAt: (row.parsedAt as Date | null) ?? null,
  };
}

export async function createDocument(input: {
  userId: string;
  fileName: string;
  fileType: Document["fileType"];
  fileSizeBytes: number;
  storageKey: string;
}): Promise<Document> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO documents (id, "userId", "fileName", "fileType", "fileSizeBytes", "storageKey")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, input.userId, input.fileName, input.fileType, input.fileSizeBytes, input.storageKey],
  );
  return mapRow(rows[0]);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const { rows } = await pool.query(`SELECT * FROM documents WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listDocumentsByUserId(userId: string): Promise<Document[]> {
  const { rows } = await pool.query(
    `SELECT * FROM documents WHERE "userId" = $1 ORDER BY "uploadedAt" DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function updateDocumentStatus(
  id: string,
  status: Document["status"],
  errorMessage?: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE documents
     SET status = $2::"DocumentStatus", "errorMessage" = $3, "parsedAt" = CASE WHEN $2::"DocumentStatus" = 'PARSED' THEN now() ELSE "parsedAt" END
     WHERE id = $1`,
    [id, status, errorMessage ?? null],
  );
}

export async function deleteDocument(id: string): Promise<void> {
  await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);
}
