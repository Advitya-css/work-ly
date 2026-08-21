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
  if (!checkRateLimit(`auth_${ip}`, 5, 60)) {
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

  const rememberMe = formData.get("rememberMe") === "on";
  const result = await authProvider.signUp({ ...parsed.data, rememberMe });
  if (result.error) {
    return { error: result.error };
  }

  redirect("/onboarding");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`auth_${ip}`, 5, 60)) {
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
  if (result.error) {
    return { error: result.error };
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
  if (!checkRateLimit(`auth_${ip}`, 3, 300)) {
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
  if (!checkRateLimit(`auth_${ip}`, 5, 60)) {
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
  if (!checkRateLimit(`auth_${ip}`, 3, 300)) {
    return { error: "Too many attempts. Please try again later." };
  }

  const email = formData.get("email") as string;
  if (!email) return { error: "Invalid request." };

  const { getUserByEmail, setVerificationToken } = await import("@/lib/db/users");
  const { sendVerificationEmail } = await import("@/lib/email");
  const { randomUUID } = await import("crypto");

  const user = await getUserByEmail(email);
  if (!user) {
    return { error: "User not found." };
  }

  if (user.emailVerified) {
    return { error: "This email is already verified. Please log in." };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await setVerificationToken(user.id, token, expiresAt);
  
  sendVerificationEmail(user.email, token).catch((err) => {
    console.error("[workly:email] Failed to resend verification email:", err);
  });

  return { success: true };
}
