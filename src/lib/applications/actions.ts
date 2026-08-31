"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { pool } from "@/lib/db/pool";
import { randomUUID } from "crypto";

import { getCurrentUser } from "@/lib/auth";
import {
  createApplication,
  deleteApplication,
  getApplicationById,
  getApplicationByOpportunityId,
  setApplicationStatus,
  updateApplication,
} from "@/lib/db/applications";
import { getOpportunityById } from "@/lib/db/opportunities";
import { getJobById } from "@/lib/db/jobs";
import type {
  Application,
  ApplicationContact,
  ApplicationInterview,
  ApplicationStatus,
} from "@/lib/db/types";

async function requireOwnedApplication(id: string): Promise<Application | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const application = await getApplicationById(user.id, id);
  if (!application || application.userId !== user.id) return null;
  return application;
}

function revalidateApplicationViews(id?: string) {
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/opportunities");
  if (id) revalidatePath(`/applications/${id}`);
}

/**
 * Creates an application from a tracked opportunity.
 *
 * Copies the job facts and BOTH scores onto the application row at this
 * moment. That snapshot is the entire basis of the outcome analytics: it
 * records what Work-ly believed at the time you applied, which is the only
 * version of those numbers that can be honestly compared against what
 * happened next.
 */
export async function createApplicationFromOpportunityAction(
  opportunityId: string,
  status: ApplicationStatus = "APPLIED",
): Promise<{ applicationId: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity || opportunity.userId !== user.id) return { error: "Opportunity not found." };

  const existing = await getApplicationByOpportunityId(opportunityId);
  if (existing) {
    return { applicationId: existing.id };
  }

  const job = await getJobById(user.id, opportunity.jobId);

  const application = await createApplication(user.id, {
    opportunityId: opportunity.id,
    jobId: opportunity.jobId,
    jobAnalysisId: opportunity.jobAnalysisId,
    roleTitle: job?.title ?? "Untitled role",
    company: job?.company ?? null,
    industry: job?.industry ?? null,
    location: job?.location ?? null,
    country: job?.country ?? null,
    fitScoreAtApply: opportunity.fitScore,
    priorityScoreAtApply: opportunity.priorityScore,
    status,
  });

  revalidateApplicationViews(application.id);
  return { applicationId: application.id };
}

export interface ManualApplicationInput {
  roleTitle: string;
  company?: string;
  industry?: string;
  location?: string;
  status?: ApplicationStatus;
}

/** For roles applied to outside Work-ly - the tracker shouldn't only work for jobs it analyzed. */
export async function createManualApplicationAction(
  input: ManualApplicationInput,
): Promise<{ applicationId: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const roleTitle = input.roleTitle.trim();
  if (!roleTitle) return { error: "Enter the role title." };

  const application = await createApplication(user.id, {
    roleTitle,
    company: input.company?.trim() || null,
    industry: input.industry?.trim() || null,
    location: input.location?.trim() || null,
    status: input.status ?? "APPLIED",
  });

  revalidateApplicationViews(application.id);
  return { applicationId: application.id };
}

export async function setApplicationStatusAction(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  await setApplicationStatus(id, status);

  // Feature: Auto-add to resume when hired
  if (status === "OFFER") {
    try {
      const profile = await getCareerProfileByUserId(application.userId);
      if (profile && application.company) {
        // Prevent duplicates
        const { rows } = await pool.query(
          `SELECT id FROM experiences WHERE "careerProfileId" = $1 AND company = $2 AND role = $3 LIMIT 1`,
          [profile.id, application.company, application.roleTitle]
        );
        if (rows.length === 0) {
          await pool.query(
            `INSERT INTO experiences (id, "careerProfileId", company, role, "startDate", "isCurrent", "updatedAt")
             VALUES ($1, $2, $3, $4, now(), true, now())`,
            [randomUUID(), profile.id, application.company, application.roleTitle]
          );
        }
      }
    } catch (error) {
      console.error("Failed to auto-add experience on hire", error);
    }
  }

  revalidateApplicationViews(id);
}

export async function updateApplicationAction(
  id: string,
  fields: {
    cvVersion?: string | null;
    coverLetter?: string | null;
    notes?: string | null;
    dateApplied?: string | null;
    salaryOffered?: number | null;
    salaryCurrency?: string | null;
  },
): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;

  const parsedDate =
    fields.dateApplied === undefined
      ? undefined
      : fields.dateApplied
        ? new Date(fields.dateApplied)
        : null;

  await updateApplication(id, {
    ...fields,
    dateApplied: parsedDate && Number.isNaN(parsedDate.getTime()) ? null : parsedDate,
  });
  revalidateApplicationViews(id);
}

export async function addContactAction(id: string, contact: ApplicationContact): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  if (!contact.name?.trim()) return;
  await updateApplication(id, { contacts: [...application.contacts, contact] });
  revalidateApplicationViews(id);
}

export async function removeContactAction(id: string, index: number): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  await updateApplication(id, { contacts: application.contacts.filter((_, i) => i !== index) });
  revalidateApplicationViews(id);
}

export async function addInterviewAction(
  id: string,
  interview: ApplicationInterview,
): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  if (!interview.date) return;
  await updateApplication(id, { interviews: [...application.interviews, interview] });
  revalidateApplicationViews(id);
}

export async function removeInterviewAction(id: string, index: number): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  await updateApplication(id, { interviews: application.interviews.filter((_, i) => i !== index) });
  revalidateApplicationViews(id);
}

export async function deleteApplicationAction(id: string): Promise<void> {
  const application = await requireOwnedApplication(id);
  if (!application) return;
  await deleteApplication(id);
  revalidateApplicationViews();
  redirect("/applications");
}

import { generateFollowUpEmail } from "@/lib/ai/providers/tailor-ai";

export async function generateFollowUpEmailAction(applicationId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const application = await requireOwnedApplication(applicationId);
    if (!application) return { error: "Not found" };

    if (!application.jobId) return { error: "Application is not linked to a job" };
    const job = await getJobById(user.id, application.jobId);
    if (!job) return { error: "Job not found" };

    const result = await generateFollowUpEmail(application, job);
    return { data: result };
  } catch (err) {
    console.error(err);
    return { error: "Failed to generate email." };
  }
}
