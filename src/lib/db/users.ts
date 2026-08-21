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
    emailVerified: (row.emailVerified as boolean) ?? false,
    verificationToken: (row.verificationToken as string | null) ?? null,
    verificationTokenExpiresAt: (row.verificationTokenExpiresAt as Date | null) ?? null,
    resetPasswordToken: (row.resetPasswordToken as string | null) ?? null,
    resetPasswordTokenExpiresAt: (row.resetPasswordTokenExpiresAt as Date | null) ?? null,
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
  verificationToken?: string | null;
  verificationTokenExpiresAt?: Date | null;
}): Promise<User> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, "passwordHash", name, "verificationToken", "verificationTokenExpiresAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING *`,
    [
      id,
      input.email.toLowerCase().trim(),
      input.passwordHash,
      input.name ?? null,
      input.verificationToken ?? null,
      input.verificationTokenExpiresAt ?? null,
    ],
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

export async function setEmailVerified(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET "emailVerified" = true, "verificationToken" = NULL, "verificationTokenExpiresAt" = NULL, "updatedAt" = now() WHERE id = $1`,
    [userId],
  );
}

export async function findUserByVerificationToken(token: string): Promise<User | null> {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE "verificationToken" = $1 AND "verificationTokenExpiresAt" > now() LIMIT 1`,
    [token],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function setVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `UPDATE users SET "verificationToken" = $2, "verificationTokenExpiresAt" = $3, "updatedAt" = now() WHERE id = $1`,
    [userId, token, expiresAt],
  );
}

export async function setResetPasswordToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `UPDATE users SET "resetPasswordToken" = $2, "resetPasswordTokenExpiresAt" = $3, "updatedAt" = now() WHERE id = $1`,
    [userId, token, expiresAt],
  );
}

export async function findUserByResetPasswordToken(token: string): Promise<User | null> {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE "resetPasswordToken" = $1 AND "resetPasswordTokenExpiresAt" > now() LIMIT 1`,
    [token],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.query(
    `UPDATE users SET "passwordHash" = $2, "resetPasswordToken" = NULL, "resetPasswordTokenExpiresAt" = NULL, "updatedAt" = now() WHERE id = $1`,
    [userId, passwordHash],
  );
}
