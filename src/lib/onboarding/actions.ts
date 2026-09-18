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


export async function completeOnboardingAndGoToDiscoverAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  await markUserOnboarded(user.id);
  redirect("/discover");
}

export async function loadSampleProfileAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateCareerProfile(user.id);

  // Pre-fill a robust sample profile for a Senior PM
  await pool.query(
    `UPDATE career_profiles 
     SET headline = 'Senior Product Manager',
         location = 'San Francisco, CA',
         "currentRole" = 'Product Manager',
         "yearsExperience" = 6,
         skills = $1,
         "updatedAt" = now()
     WHERE id = $2`,
    [JSON.stringify(["Product Strategy", "Agile Methodologies", "User Research", "A/B Testing", "Go-to-Market Strategy", "SQL", "Jira"]), profile.id]
  );
  
  // Create a target goal too so discovery works beautifully
  const { rows: goals } = await pool.query(`SELECT id FROM career_goals WHERE "userId" = $1`, [user.id]);
  if (goals.length === 0) {
    await pool.query(
      `INSERT INTO career_goals (id, "userId", status, "primaryTargetRole", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'ACTIVE', 'Senior Product Manager', now())`,
      [user.id]
    );
  } else {
    await pool.query(
      `UPDATE career_goals SET "primaryTargetRole" = 'Senior Product Manager', "updatedAt" = now() WHERE "userId" = $1`,
      [user.id]
    );
  }

  await markUserOnboarded(user.id);
  redirect("/discover");
}
