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
    verificationCodeHash: (row.verificationCodeHash as string | null) ?? null,
    verificationCodeExpiresAt: (row.verificationCodeExpiresAt as Date | null) ?? null,
    verificationAttempts: (row.verificationAttempts as number) ?? 0,
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
  passwordHash?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  emailVerified?: boolean;
}): Promise<User> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, "passwordHash", name, "avatarUrl", "verificationCodeHash", "verificationCodeExpiresAt", "emailVerified", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     RETURNING *`,
    [
      id,
      input.email.toLowerCase().trim(),
      input.passwordHash ?? null,
      input.name ?? null,
      input.avatarUrl ?? null,
      input.verificationCodeHash ?? null,
      input.verificationCodeExpiresAt ?? null,
      input.emailVerified ?? false,
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
    `UPDATE users
     SET "emailVerified" = true,
         "verificationCodeHash" = NULL,
         "verificationCodeExpiresAt" = NULL,
         "verificationAttempts" = 0,
         "updatedAt" = now()
     WHERE id = $1`,
    [userId],
  );
}

/** Issues a fresh code, replacing any previous one and resetting the attempt counter. */
export async function setVerificationCode(userId: string, codeHash: string, expiresAt: Date): Promise<void> {
  await pool.query(
    `UPDATE users
     SET "verificationCodeHash" = $2,
         "verificationCodeExpiresAt" = $3,
         "verificationAttempts" = 0,
         "updatedAt" = now()
     WHERE id = $1`,
    [userId, codeHash, expiresAt],
  );
}

/** Records one failed code guess. Returns the attempt count after this one. */
export async function incrementVerificationAttempts(userId: string): Promise<number> {
  const { rows } = await pool.query(
    `UPDATE users SET "verificationAttempts" = "verificationAttempts" + 1, "updatedAt" = now()
     WHERE id = $1
     RETURNING "verificationAttempts"`,
    [userId],
  );
  return (rows[0]?.verificationAttempts as number | undefined) ?? 0;
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
