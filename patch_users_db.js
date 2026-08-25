const fs = require('fs');

let code = fs.readFileSync('src/lib/db/users.ts', 'utf8');
const target = `export async function createUser(input: {
  email: string;
  passwordHash: string;
  name?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
}): Promise<User> {`;
const replacement = `export async function createUser(input: {
  email: string;
  passwordHash?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  verificationCodeHash?: string | null;
  verificationCodeExpiresAt?: Date | null;
  emailVerified?: boolean;
}): Promise<User> {`;
code = code.replace(target, replacement);

const queryTarget = `[
      id,
      input.email.toLowerCase().trim(),
      input.passwordHash,
      input.name ?? null,
      input.verificationCodeHash ?? null,
      input.verificationCodeExpiresAt ?? null,
    ],`;
const queryReplacement = `[
      id,
      input.email.toLowerCase().trim(),
      input.passwordHash ?? null,
      input.name ?? null,
      input.avatarUrl ?? null,
      input.verificationCodeHash ?? null,
      input.verificationCodeExpiresAt ?? null,
      input.emailVerified ?? false,
    ],`;
code = code.replace(queryTarget, queryReplacement);

const insertTarget = `INSERT INTO users (id, email, "passwordHash", name, "verificationCodeHash", "verificationCodeExpiresAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now())`;
const insertReplacement = `INSERT INTO users (id, email, "passwordHash", name, "avatarUrl", "verificationCodeHash", "verificationCodeExpiresAt", "emailVerified", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`;
code = code.replace(insertTarget, insertReplacement);

fs.writeFileSync('src/lib/db/users.ts', code);

// Fix local.ts
let localAuth = fs.readFileSync('src/lib/auth/providers/local.ts', 'utf8');
localAuth = localAuth.replace('import { createUser, getUserByEmail, getUserById, updateUser } from "@/lib/db/users";', 'import { createUser, getUserByEmail, getUserById, updateUserProfile } from "@/lib/db/users";');
localAuth = localAuth.replace('user = await updateUser(user.id, updates);', 'user = await updateUserProfile(user.id, updates);');
localAuth = localAuth.replace('name: input.name || null,', 'name: input.name || null,\n        emailVerified: true,');
fs.writeFileSync('src/lib/auth/providers/local.ts', localAuth);

