import "server-only";
import { randomUUID } from "crypto";
import { pool } from "./pool";
import type { User } from "./types";

function mapRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: (row.passwordHash as string | null) ?? null,
    name: (row.name as string | null) ?? null,
    avatarUrl: (row.avatarUrl as string | null) ?? null,
    onboardedAt: (row.onboardedAt as Date | null) ?? null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  name?: string | null;
}): Promise<User> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, "passwordHash", name, "updatedAt")
     VALUES ($1, $2, $3, $4, now())
     RETURNING *`,
    [id, input.email.toLowerCase().trim(), input.passwordHash, input.name ?? null],
  );
  return mapRow(rows[0]);
}

export async function markUserOnboarded(id: string): Promise<void> {
  await pool.query(
    `UPDATE users SET "onboardedAt" = now(), "updatedAt" = now() WHERE id = $1`,
    [id],
  );
}

export async function updateUserProfile(
  id: string,
  input: { name?: string | null; avatarUrl?: string | null },
): Promise<User> {
  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         "avatarUrl" = COALESCE($3, "avatarUrl"),
         "updatedAt" = now()
     WHERE id = $1
     RETURNING *`,
    [id, input.name ?? null, input.avatarUrl ?? null],
  );
  return mapRow(rows[0]);
}
