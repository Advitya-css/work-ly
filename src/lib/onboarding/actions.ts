"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { markUserOnboarded } from "@/lib/db/users";

export async function completeOnboardingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  await markUserOnboarded(user.id);
  redirect("/dashboard");
}
