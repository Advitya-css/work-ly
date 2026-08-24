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
import { issueVerificationCode } from "@/lib/auth/verification";
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
  async signUp({ email, password, name }): Promise<AuthResult> {
    const existing = await getUserByEmail(email);
    if (existing) {
      return { error: "An account with this email already exists." };
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({ email, passwordHash, name: name ?? null });

    // The account row exists but is unverified, and no session is created
    // yet - per the product requirement, the code is what actually
    // activates the account. issueVerificationCode both stores the code's
    // hash and sends the email; the email send itself doesn't block signup
    // (a Resend outage shouldn't strand someone mid-signup - "resend code"
    // covers that case).
    await issueVerificationCode(user.id, user.email);

    return { needsVerification: true, verificationEmail: user.email };
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
};
