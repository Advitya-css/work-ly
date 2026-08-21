"use server";

import { redirect } from "next/navigation";
import { authProvider } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export interface AuthActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
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
