import "server-only";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getUserById } from "@/lib/db/users";
import {
  createSessionToken,
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "@/lib/auth/session";
import type { AuthProvider, AuthResult, AuthUser } from "@/lib/auth/types";

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  onboardedAt: Date | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    onboardedAt: user.onboardedAt,
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
    const token = await createSessionToken({ sub: user.id, email: user.email });
    await setSessionCookie(token);
    return { user: toAuthUser(user) };
  },

  async signIn({ email, password }): Promise<AuthResult> {
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return { error: "Invalid email or password." };
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }
    const token = await createSessionToken({ sub: user.id, email: user.email });
    await setSessionCookie(token);
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
