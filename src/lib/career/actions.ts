"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { upsertCareerProfile, setCareerProfilePublic } from "@/lib/db/career-profile";
import { createCareerGoal, deleteCareerGoal, getCareerGoalById, updateCareerGoal } from "@/lib/db/career-goals";
import { careerGoalSchema, careerProfileSchema } from "@/lib/validations/career";

export interface CareerActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

export async function saveCareerProfileAction(
  _prevState: CareerActionState,
  formData: FormData,
): Promise<CareerActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = careerProfileSchema.safeParse({
    headline: formData.get("headline"),
    summary: formData.get("summary"),
    location: formData.get("location"),
    currentRole: formData.get("currentRole"),
    currentCompany: formData.get("currentCompany"),
    yearsExperience: formData.get("yearsExperience") || undefined,
    skills: formData.get("skills"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const skills = parsed.data.skills
    ? parsed.data.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  await upsertCareerProfile(user.id, {
    headline: parsed.data.headline || null,
    summary: parsed.data.summary || null,
    location: parsed.data.location || null,
    currentRole: parsed.data.currentRole || null,
    currentCompany: parsed.data.currentCompany || null,
    yearsExperience: parsed.data.yearsExperience ?? null,
    skills,
  });

  revalidatePath("/career-profile");
  revalidatePath("/dashboard");
  return { success: true };
}

/** formData.getAll is required for the workModes/employmentTypes/preferredLocations groups - Object.fromEntries would silently keep only the last value. */
function parseCareerGoalForm(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  raw.workModes = formData.getAll("workModes");
  raw.employmentTypes = formData.getAll("employmentTypes");
  raw.preferredLocations = formData.getAll("preferredLocations");
  return careerGoalSchema.safeParse(raw);
}

export async function createCareerGoalAction(
  _prevState: CareerActionState,
  formData: FormData,
): Promise<CareerActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = parseCareerGoalForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  await createCareerGoal(user.id, {
    title: parsed.data.title,
    timeframe: parsed.data.timeframe || null,
    notes: parsed.data.notes || null,
    status: parsed.data.status,
    primaryTargetRole: parsed.data.primaryTargetRole || null,
    secondaryTargetRoles: parsed.data.secondaryTargetRoles,
    industries: parsed.data.industries,
    preferredLocations: parsed.data.preferredLocations,
    countries: parsed.data.countries,
    workModes: parsed.data.workModes,
    employmentTypes: parsed.data.employmentTypes,
    seniority: parsed.data.seniority || null,
    salaryMin: parsed.data.salaryMin ?? null,
    salaryMax: parsed.data.salaryMax ?? null,
    salaryCurrency: parsed.data.salaryCurrency || "USD",
    isUncertain: parsed.data.isUncertain ?? false,
  });

  revalidatePath("/career-goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCareerGoalAction(
  id: string,
  _prevState: CareerActionState,
  formData: FormData,
): Promise<CareerActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await getCareerGoalById(id);
  if (!existing || existing.userId !== user.id) {
    return { error: "You don't have access to this goal." };
  }

  const parsed = parseCareerGoalForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  await updateCareerGoal(id, {
    title: parsed.data.title,
    timeframe: parsed.data.timeframe || null,
    notes: parsed.data.notes || null,
    status: parsed.data.status,
    primaryTargetRole: parsed.data.primaryTargetRole || null,
    secondaryTargetRoles: parsed.data.secondaryTargetRoles,
    industries: parsed.data.industries,
    preferredLocations: parsed.data.preferredLocations,
    countries: parsed.data.countries,
    workModes: parsed.data.workModes,
    employmentTypes: parsed.data.employmentTypes,
    seniority: parsed.data.seniority || null,
    salaryMin: parsed.data.salaryMin ?? null,
    salaryMax: parsed.data.salaryMax ?? null,
    salaryCurrency: parsed.data.salaryCurrency || "USD",
    isUncertain: parsed.data.isUncertain ?? false,
  });

  revalidatePath("/career-goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCareerGoalAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await getCareerGoalById(id);
  if (!existing || existing.userId !== user.id) return;

  await deleteCareerGoal(id);
  revalidatePath("/career-goals");
  revalidatePath("/dashboard");
}

export async function saveLocationAction(location: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  await upsertCareerProfile(user.id, { location });
  revalidatePath("/career-profile");
  return { success: true };
}

/**
 * The only path that can ever make a profile publicly viewable at /p/[id].
 * Requires a signed-in user and only ever touches that user's own row, so
 * "Share Profile" is an explicit, per-user consent action rather than
 * something that was already true for everyone by default.
 */
export async function setProfilePublicAction(isPublic: boolean): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  await setCareerProfilePublic(user.id, isPublic);
  revalidatePath("/career-profile");
  return { success: true };
}
