"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export interface AuthActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  unverifiedEmail?: string;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`auth_login_${ip}`, 5, 60))) {
    return { error: "Too many attempts. Please try again later." };
  }
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  
  const agreeTerms = formData.get("agreeTerms") === "on";
  const agreeAge = formData.get("agreeAge") === "on";
  if (!agreeTerms || !agreeAge) {
    return { error: "You must agree to the Terms of Service and confirm you are 18 or older." };
  }
  const rememberMe = formData.get("rememberMe") === "on";

  const result = await authProvider.signUp({ ...parsed.data, rememberMe });
  if (result.error) {
    return { error: result.error };
  }

  // No session yet - signUp only ever creates the account and emails a
  // code now. redirect() throws internally, so this never falls through
  // to a state the form could render.
  redirect(`/verify-email?email=${encodeURIComponent(result.verificationEmail ?? parsed.data.email)}`);
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`auth_signup_${ip}`, 5, 60))) {
    return { error: "Too many attempts. Please try again later." };
  }
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const rememberMe = formData.get("rememberMe") === "on";
  const result = await authProvider.signIn({ ...parsed.data, rememberMe });
  if (result.needsVerification) {
    return {
      error: "Please verify your email before signing in.",
      unverifiedEmail: result.verificationEmail,
    };
  }
  if (result.error) {
    return { error: result.error };
  }

  if (result.user && !result.user.onboardedAt) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await authProvider.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`auth_forgot_${ip}`, 3, 300))) {
    return { error: "Too many attempts. Please try again later." };
  }

  const { forgotPasswordSchema } = await import("@/lib/validations/auth");
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const { getUserByEmail, setResetPasswordToken } = await import("@/lib/db/users");
  const { sendPasswordResetEmail } = await import("@/lib/email");
  const { randomUUID } = await import("crypto");

  const user = await getUserByEmail(parsed.data.email);
  if (user) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await setResetPasswordToken(user.id, token, expiresAt);
    sendPasswordResetEmail(user.email, token).catch((err) => {
      console.error("[workly:email] Failed to send reset email:", err);
    });
  }

  // Always return success to prevent email enumeration
  return { success: true };
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`auth_reset_${ip}`, 5, 60))) {
    return { error: "Too many attempts. Please try again later." };
  }

  const { resetPasswordSchema } = await import("@/lib/validations/auth");
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const token = formData.get("token") as string;
  if (!token) {
    return { error: "Invalid request." };
  }

  const { findUserByResetPasswordToken, updateUserPassword } = await import("@/lib/db/users");
  const user = await findUserByResetPasswordToken(token);
  if (!user) {
    return { error: "This password reset link has expired or is invalid. Please request a new one." };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await updateUserPassword(user.id, passwordHash);

  return { success: true };
}

export async function resendVerificationAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`auth_resend_${ip}`, 3, 300))) {
    return { error: "Too many attempts. Please try again later." };
  }

  const email = formData.get("email") as string;
  if (!email) return { error: "Invalid request." };

  const { getUserByEmail } = await import("@/lib/db/users");
  const { issueVerificationCode } = await import("@/lib/auth/verification");

  const user = await getUserByEmail(email);
  if (!user) {
    // Same response either way - confirming or denying an account exists
    // for this email from an unauthenticated "resend code" form is exactly
    // the enumeration forgotPasswordAction is careful to avoid.
    return { success: true };
  }

  if (user.emailVerified) {
    return { error: "This email is already verified. Please log in." };
  }

  // Issuing a fresh code also resets the attempt counter, so someone who
  // used up their 5 guesses on the old code gets a clean slate here.
  await issueVerificationCode(user.id, user.email);

  return { success: true };
}

export async function verifyEmailCodeAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!(await checkRateLimit(`auth_verify_${ip}`, 10, 600))) {
    return { error: "Too many attempts. Please try again later." };
  }

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const code = ((formData.get("code") as string) || "").trim();
  if (!email || !code) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const { getUserByEmail, incrementVerificationAttempts, setEmailVerified } = await import("@/lib/db/users");
  const { MAX_VERIFICATION_ATTEMPTS } = await import("@/lib/auth/verification");
  const { createSessionToken, setSessionCookie } = await import("@/lib/auth/session");
  const bcrypt = await import("bcryptjs");

  const user = await getUserByEmail(email);
  if (!user) {
    return { error: "We couldn't find that account. Please sign up again." };
  }
  if (user.emailVerified) {
    return { error: "This email is already verified. Please log in." };
  }
  if (!user.verificationCodeHash || !user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
    return { error: "That code has expired. Request a new one below." };
  }
  if (user.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    return { error: "Too many incorrect attempts. Request a new code below." };
  }

  const valid = await bcrypt.compare(code, user.verificationCodeHash);
  if (!valid) {
    const attempts = await incrementVerificationAttempts(user.id);
    const remaining = Math.max(0, MAX_VERIFICATION_ATTEMPTS - attempts);
    return {
      error:
        remaining > 0
          ? `That code isn't right. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
          : "Too many incorrect attempts. Request a new code below.",
    };
  }

  await setEmailVerified(user.id);

  // Now that the email is confirmed, actually create the session - this is
  // the moment "the account" becomes usable.
  const token = await createSessionToken({ sub: user.id, email: user.email }, false);
  await setSessionCookie(token, false);

  redirect("/onboarding");
}
