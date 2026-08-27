"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { markUserOnboarded } from "@/lib/db/users";
import { getOrCreateCareerProfile } from "@/lib/db/career-profile";
import { pool } from "@/lib/db/pool";

export async function completeOnboardingAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  await markUserOnboarded(user.id);
  redirect("/dashboard");
}

export async function setupStudentProfileAction(formData: FormData): Promise<{ error?: string } | void> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not logged in" };

  const university = formData.get("university")?.toString();
  const major = formData.get("major")?.toString();
  const studentCountry = formData.get("studentCountry")?.toString();
  const jobType = formData.get("jobType")?.toString();

  if (!university || !major || !studentCountry) {
    return { error: "Please fill out all required fields" };
  }

  const profile = await getOrCreateCareerProfile(user.id);

  const isPartTimeMode = jobType === "part-time";

  await pool.query(
    `UPDATE career_profiles 
     SET "isStudent" = true, 
         "university" = $1, 
         "major" = $2, 
         "studentCountry" = $3,
         "isPartTimeMode" = $4
     WHERE id = $5`,
    [university, major, studentCountry, isPartTimeMode, profile.id]
  );

  await markUserOnboarded(user.id);
  redirect("/student");
}
