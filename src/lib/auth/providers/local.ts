import "server-only";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getUserById, updateUserProfile } from "@/lib/db/users";
import { pool } from "@/lib/db/pool";
import {
  createSessionToken,
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";
import { issueVerificationCode } from "@/lib/auth/verification";
import type { AuthProvider, AuthResult, AuthUser } from "@/lib/auth/types";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardedAt: Date | null;
  emailVerified?: boolean;
  isPro?: boolean;
  proUntil?: Date | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    onboardedAt: user.onboardedAt,
    emailVerified: user.emailVerified ?? false,
    isPro: user.isPro ?? false,
    proUntil: user.proUntil ?? null,
  };
}

export const localAuthProvider: AuthProvider = {
  async signUp({ email, password, name }): Promise<AuthResult> {
    const existing = await getUserByEmail(email);
    if (existing) {
      return { error: "An account with this email already exists." };
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({ email, passwordHash, name: name ?? null });

    // Dropping immediate email verification to fix conversion drop-off.
    // We now automatically verify and log them in so they hit the "aha" moment faster.
    await pool.query('UPDATE users SET "emailVerified" = true WHERE id = $1', [user.id]);
    
    // Create the session immediately
    const rememberMe = arguments[0].rememberMe ?? true;
    const token = await createSessionToken({ sub: user.id, email: user.email }, rememberMe);
    await setSessionCookie(token, rememberMe);

    return { user: toAuthUser(user), needsVerification: false };
  },

  async signIn({ email, password, rememberMe }): Promise<AuthResult> {
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      await bcrypt.hash(password, 10); // dummy hash for timing attack prevention
      return { error: "Invalid email or password." };
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }
    if (!user.emailVerified) {
      return { needsVerification: true, verificationEmail: user.email };
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

  async signInWithOAuth(input: { provider: "google"; providerId: string; email: string; name?: string; avatarUrl?: string }): Promise<import("../types").AuthResult> {
    let user = await getUserByEmail(input.email);
    
    if (user) {
      // Update name/avatar if empty, but don't overwrite user's custom changes
      const updates: { name?: string; avatarUrl?: string } = {};
      if (!user.name && input.name) updates.name = input.name;
      if (!user.avatarUrl && input.avatarUrl) updates.avatarUrl = input.avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await updateUserProfile(user.id, updates);
      }
    } else {
      user = await createUser({
        email: input.email,
        name: input.name || null,
        emailVerified: true,
        avatarUrl: input.avatarUrl || null,
      }); // Implicitly passwordHash is null
    }

    const token = await createSessionToken({ sub: user.id, email: user.email }, true);
    await setSessionCookie(token, true);

    return { user: toAuthUser(user) };
  }
};
