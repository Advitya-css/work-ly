"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { markUserOnboarded } from "@/lib/db/users";
import { getOrCreateCareerProfile } from "@/lib/db/career-profile";
import { pool } from "@/lib/db/pool";
import { parseOnboardingIntent } from "./intent";

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

  // Pre-fill a robust sample profile for a Senior PM. Flagged isSampleData so
  // the rest of the app can tell this is a fabricated demo, not something
  // the user provided - see the isSampleData migration for why that matters.
  // upsertCareerProfile (the real-data path used by resume parsing and the
  // profile form) always clears this flag back to false the moment real
  // facts are saved, so it can't linger once the user uploads their resume.
  await pool.query(
    `UPDATE career_profiles
     SET headline = 'Senior Product Manager',
         location = 'San Francisco, CA',
         "currentRole" = 'Product Manager',
         "yearsExperience" = 6,
         skills = $1,
         "isSampleData" = true,
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

/**
 * The first question on the welcome screen: what brought you here. It
 * decides where the first session ends up (a career-switcher is pointed at
 * the dream-job check once they've seen their matches) and, for freelancers,
 * switches on freelance mode so the very first search looks for contract
 * work instead of full-time roles.
 */
export async function chooseOnboardingIntentAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const intent = parseOnboardingIntent(formData.get("intent")?.toString());
  if (intent === "freelance") {
    await pool.query(
      `INSERT INTO "career_profiles" ("id", "userId", "isFreelanceMode", "updatedAt")
       VALUES (gen_random_uuid(), $1, true, now())
       ON CONFLICT ("userId") DO UPDATE SET "isFreelanceMode" = true, "updatedAt" = now()`,
      [user.id],
    );
  }
  redirect(`/onboarding?step=upload&intent=${intent}`);
}
