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
    isPro: (row.isPro as boolean) ?? false,
    proUntil: (row.proUntil as Date | null) ?? null,
    // Read defensively: these columns arrive with the yearly-perks
    // migration, and the app must keep working before it's applied.
    proPlan: (row.proPlan as string | null | undefined) ?? null,
    watchEnabled: (row.watchEnabled as boolean | undefined) ?? false,
    watchMinFit: (row.watchMinFit as number | undefined) ?? 85,
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

/**
 * Referrals, abuse-resistant.
 *
 * The first version granted both accounts a month of Pro at signup for
 * ANY ?ref= value: an invalid code still gave the new account Pro, and
 * with emails auto-verified anyone could farm unlimited Pro for their own
 * account by signing up throwaways with their own id. Now:
 *   - at signup we only RECORD a referral, and only if the referrer is a
 *     real, different account and this account has no referrer yet;
 *   - both rewards are granted on ACTIVATION - the referee's first
 *     successfully parsed resume - exactly once (the marker "|credited");
 *   - a referrer earns at most MAX_REFERRAL_CREDITS_PER_YEAR months a year;
 *   - an account with open-ended Pro (proUntil NULL) is never shortened.
 */
export const MAX_REFERRAL_CREDITS_PER_YEAR = 12;
const CREDITED = "|credited";

export async function recordReferral(newUserId: string, referrerId: string): Promise<void> {
  const ref = referrerId.trim();
  if (!ref || ref === newUserId || ref.length > 64) return;
  await pool.query(
    `UPDATE users SET "referredBy" = $2, "updatedAt" = now()
      WHERE id = $1 AND "referredBy" IS NULL
        AND EXISTS (SELECT 1 FROM users r WHERE r.id = $2 AND r.id <> $1)`,
    [newUserId, ref],
  );
}

function extendProSql(param: string): string {
  // Open-ended Pro stays open-ended; otherwise add 30 days from the later
  // of "now" and the current expiry, so an expired account restarts today.
  return `"isPro" = true,
          "proUntil" = CASE WHEN "isPro" = true AND "proUntil" IS NULL THEN NULL
                            ELSE GREATEST(COALESCE("proUntil", now()), now()) + interval '30 days' END,
          "updatedAt" = now()
     WHERE id = ${param}`;
}

/** Grants both referral rewards once the referred user has activated. Safe to call repeatedly. */
export async function creditReferralOnActivation(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT "referredBy" FROM users WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    const referredBy: string | null = rows[0]?.referredBy ?? null;
    if (!referredBy || referredBy.endsWith(CREDITED)) {
      await client.query("ROLLBACK");
      return;
    }
    await client.query(`UPDATE users SET "referredBy" = $2, ${extendProSql("$1")}`, [userId, `${referredBy}${CREDITED}`]);

    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE "referredBy" = $1 AND "updatedAt" > now() - interval '365 days'`,
      [`${referredBy}${CREDITED}`],
    );
    if ((countRows[0]?.n ?? 0) <= MAX_REFERRAL_CREDITS_PER_YEAR) {
      await client.query(`UPDATE users SET ${extendProSql("$1")}`, [referredBy]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
