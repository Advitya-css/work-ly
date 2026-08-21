import "server-only";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getUserById } from "@/lib/db/users";
import {
  createSessionToken,
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email";
import type { AuthProvider, AuthResult, AuthUser } from "@/lib/auth/types";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardedAt: Date | null;
  emailVerified?: boolean;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    onboardedAt: user.onboardedAt,
    emailVerified: user.emailVerified ?? false,
  };
}

export const localAuthProvider: AuthProvider = {
  async signUp({ email, password, name, rememberMe }): Promise<AuthResult> {
    const existing = await getUserByEmail(email);
    if (existing) {
      return { error: "An account with this email already exists." };
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = randomUUID();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await createUser({
      email,
      passwordHash,
      name: name ?? null,
      verificationToken,
      verificationTokenExpiresAt,
    });

    // Send verification email (non-blocking - don't fail signup if email fails)
    sendVerificationEmail(user.email, verificationToken).catch((err) => {
      console.error("[workly:email] Failed to send verification email:", err);
    });

    const token = await createSessionToken({ sub: user.id, email: user.email }, rememberMe);
    await setSessionCookie(token, rememberMe);
    return { user: toAuthUser(user) };
  },

  async signIn({ email, password, rememberMe }): Promise<AuthResult> {
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return { error: "Invalid email or password." };
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }
    const token = await createSessionToken({ sub: user.id, email: user.email }, rememberMe);
    await setSessionCookie(token, rememberMe);
    return { user: toAuthUser(user) };
  },

  async signOut() {
    await clearSessionCookie();
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = await readSessionToken();
    if (!token) return null;
    const payload = await verifySessionToken(token);
    if (!payload) return null;
    const user = await getUserById(payload.sub);
    return user ? toAuthUser(user) : null;
  },
};
