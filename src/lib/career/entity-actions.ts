"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId, getOrCreateCareerProfile } from "@/lib/db/career-profile";
import * as educationDb from "@/lib/db/education";
import * as experienceDb from "@/lib/db/experience";
import * as projectDb from "@/lib/db/projects";
import * as skillDb from "@/lib/db/skills";
import * as achievementDb from "@/lib/db/achievements";
import * as certificationDb from "@/lib/db/certifications";
import {
  achievementSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
  skillSchema,
} from "@/lib/validations/career-entities";

export interface EntityActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Verifies `careerProfileId` actually belongs to `userId` before any write - every mutation below calls this first. */
async function assertOwnership(userId: string, careerProfileId: string) {
  const profile = await getCareerProfileByUserId(userId);
  if (!profile || profile.id !== careerProfileId) {
    throw new Error("You don't have access to this record.");
  }
  return profile;
}

function revalidateProfilePaths() {
  revalidatePath("/career-profile");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
}

// --- Education ---------------------------------------------------------

export async function createEducationAction(
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const parsed = educationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const profile = await getOrCreateCareerProfile(user.id);
  await educationDb.createEducation(profile.id, {
    ...parsed.data,
    startDate: toDate(parsed.data.startDate),
    endDate: toDate(parsed.data.endDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function updateEducationAction(
  id: string,
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const existing = await educationDb.getEducationById(id);
  if (!existing) return { error: "Not found." };
  await assertOwnership(user.id, existing.careerProfileId);

  const parsed = educationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await educationDb.updateEducation(id, {
    ...parsed.data,
    startDate: toDate(parsed.data.startDate),
    endDate: toDate(parsed.data.endDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function deleteEducationAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await educationDb.getEducationById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await educationDb.deleteEducation(id);
  revalidateProfilePaths();
}

// --- Experience ----------------------------------------------------------

export async function createExperienceAction(
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const parsed = experienceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const profile = await getOrCreateCareerProfile(user.id);
  await experienceDb.createExperience(profile.id, {
    ...parsed.data,
    startDate: toDate(parsed.data.startDate),
    endDate: toDate(parsed.data.endDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function updateExperienceAction(
  id: string,
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const existing = await experienceDb.getExperienceById(id);
  if (!existing) return { error: "Not found." };
  await assertOwnership(user.id, existing.careerProfileId);

  const parsed = experienceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await experienceDb.updateExperience(id, {
    ...parsed.data,
    startDate: toDate(parsed.data.startDate),
    endDate: toDate(parsed.data.endDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function deleteExperienceAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await experienceDb.getExperienceById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await experienceDb.deleteExperience(id);
  revalidateProfilePaths();
}

// --- Projects --------------------------------------------------------

export async function createProjectAction(
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const profile = await getOrCreateCareerProfile(user.id);
  await projectDb.createProject(profile.id, {
    ...parsed.data,
    startDate: toDate(parsed.data.startDate),
    endDate: toDate(parsed.data.endDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function updateProjectAction(
  id: string,
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const existing = await projectDb.getProjectById(id);
  if (!existing) return { error: "Not found." };
  await assertOwnership(user.id, existing.careerProfileId);

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await projectDb.updateProject(id, {
    ...parsed.data,
    startDate: toDate(parsed.data.startDate),
    endDate: toDate(parsed.data.endDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function deleteProjectAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await projectDb.getProjectById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await projectDb.deleteProject(id);
  revalidateProfilePaths();
}

// --- Skills ------------------------------------------------------------

export async function createSkillAction(
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  const parsed = skillSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const profile = await getOrCreateCareerProfile(user.id);
  await skillDb.createSkill(profile.id, {
    name: parsed.data.name,
    category: parsed.data.category,
    proficiency: parsed.data.proficiency || null,
    experienceLevel: parsed.data.experienceLevel || null,
    evidenceLevel: parsed.data.evidenceLevel,
    recency: parsed.data.recency,
    source: "USER",
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function updateSkillAction(
  id: string,
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const existing = await skillDb.getSkillById(id);
  if (!existing) return { error: "Not found." };
  await assertOwnership(user.id, existing.careerProfileId);

  const parsed = skillSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await skillDb.updateSkill(id, {
    name: parsed.data.name,
    category: parsed.data.category,
    proficiency: parsed.data.proficiency || null,
    experienceLevel: parsed.data.experienceLevel || null,
    evidenceLevel: parsed.data.evidenceLevel,
    recency: parsed.data.recency,
    // Editing a suggested/inferred skill is the user confirming it.
    isTransferable: false,
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function deleteSkillAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await skillDb.getSkillById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await skillDb.deleteSkill(id);
  revalidateProfilePaths();
}

/** "Yes, that's actually a skill of mine" on a potential transferable skill - turns it into a confirmed, stated skill. */
export async function acceptTransferableSkillAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await skillDb.getSkillById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await skillDb.acceptTransferableSkill(id);
  revalidateProfilePaths();
}

// --- Achievements --------------------------------------------------------

export async function createAchievementAction(
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const parsed = achievementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const profile = await getOrCreateCareerProfile(user.id);
  await achievementDb.createAchievement(profile.id, {
    ...parsed.data,
    date: toDate(parsed.data.date),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function updateAchievementAction(
  id: string,
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const existing = await achievementDb.getAchievementById(id);
  if (!existing) return { error: "Not found." };
  await assertOwnership(user.id, existing.careerProfileId);

  const parsed = achievementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await achievementDb.updateAchievement(id, { ...parsed.data, date: toDate(parsed.data.date) });
  revalidateProfilePaths();
  return { success: true };
}

export async function deleteAchievementAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await achievementDb.getAchievementById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await achievementDb.deleteAchievement(id);
  revalidateProfilePaths();
}

// --- Certifications --------------------------------------------------

export async function createCertificationAction(
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const parsed = certificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const profile = await getOrCreateCareerProfile(user.id);
  await certificationDb.createCertification(profile.id, {
    ...parsed.data,
    issueDate: toDate(parsed.data.issueDate),
    expiryDate: toDate(parsed.data.expiryDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function updateCertificationAction(
  id: string,
  _prev: EntityActionState,
  formData: FormData,
): Promise<EntityActionState> {
  const user = await requireUser();
  const existing = await certificationDb.getCertificationById(id);
  if (!existing) return { error: "Not found." };
  await assertOwnership(user.id, existing.careerProfileId);

  const parsed = certificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await certificationDb.updateCertification(id, {
    ...parsed.data,
    issueDate: toDate(parsed.data.issueDate),
    expiryDate: toDate(parsed.data.expiryDate),
  });
  revalidateProfilePaths();
  return { success: true };
}

export async function deleteCertificationAction(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await certificationDb.getCertificationById(id);
  if (!existing) return;
  await assertOwnership(user.id, existing.careerProfileId);
  await certificationDb.deleteCertification(id);
  revalidateProfilePaths();
}
