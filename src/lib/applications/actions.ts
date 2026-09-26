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
    // "Preparing" first, "Applied" later used to leave the application
    // stuck at Preparing, so it never counted as sent in the outcomes.
    if (status === "APPLIED" && (existing.status === "SAVED" || existing.status === "PREPARING")) {
      await setApplicationStatus(existing.id, "APPLIED");
      revalidateApplicationViews(existing.id);
    }
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

  // An offer is not a hire: it can still be negotiated or declined, so
  // nothing is added to the profile here. acceptOfferAction does that when
  // the user says they took the job.

  revalidateApplicationViews(id);
}

/**
 * The user accepted this offer: add the role to their profile as their
 * current job. Optionally marks their other current roles as ended today
 * (most people leave the old job; some keep a side role, so it's a choice).
 */
export async function acceptOfferAction(
  id: string,
  options: { endOtherCurrentRoles?: boolean } = {},
): Promise<{ ok: true; alreadyAdded: boolean } | { error: string }> {
  const application = await requireOwnedApplication(id);
  if (!application) return { error: "Application not found." };
  if (application.status !== "OFFER") return { error: "Mark this application as an offer first." };

  try {
    const profile = await getCareerProfileByUserId(application.userId);
    if (!profile) return { error: "Set up your career profile first." };
    const company = application.company?.trim() || "Unknown company";

    const { rows } = await pool.query(
      `SELECT id FROM experiences WHERE "careerProfileId" = $1 AND company = $2 AND title = $3 LIMIT 1`,
      [profile.id, company, application.roleTitle],
    );
    const alreadyAdded = rows.length > 0;

    if (options.endOtherCurrentRoles) {
      await pool.query(
        `UPDATE experiences SET "isCurrent" = false, "endDate" = COALESCE("endDate", now()), "updatedAt" = now()
         WHERE "careerProfileId" = $1 AND "isCurrent" = true AND NOT (company = $2 AND title = $3)`,
        [profile.id, company, application.roleTitle],
      );
    }

    if (!alreadyAdded) {
      await pool.query(
        `INSERT INTO experiences (id, "careerProfileId", company, title, location, "startDate", "isCurrent", source, "updatedAt")
         VALUES ($1, $2, $3, $4, $5, now(), true, 'USER', now())`,
        [randomUUID(), profile.id, company, application.roleTitle, application.location ?? null],
      );
    }

    revalidateApplicationViews(id);
    revalidatePath("/career-profile");
    return { ok: true, alreadyAdded };
  } catch (error) {
    console.error("[workly] acceptOfferAction failed", error);
    return { error: "Couldn't update your profile. Please try again." };
  }
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
import { withinProAiBudget } from "@/lib/ai/career-context";
import { FREE_AI_LIMIT_MESSAGE, spendFreeAi } from "@/lib/ai/allowance";

export async function generateFollowUpEmailAction(applicationId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const application = await requireOwnedApplication(applicationId);
    if (!application) return { error: "Not found" };

    if (!(await withinProAiBudget(user.id, { countsTowardRefund: false }))) {
      return { error: "You've used a lot of AI tools this hour. Try again in a little while." };
    }
    if (!(await spendFreeAi(user))) return { error: FREE_AI_LIMIT_MESSAGE };
    // Works for manually logged applications too: the role and company on
    // the application are enough for a follow-up note.
    const job = application.jobId ? await getJobById(user.id, application.jobId) : null;
    const result = await generateFollowUpEmail(
      application,
      job ?? ({ title: application.roleTitle, company: application.company ?? "the company" } as Parameters<typeof generateFollowUpEmail>[1]),
    );
    return { data: result };
  } catch (err) {
    console.error(err);
    return { error: "Failed to generate email." };
  }
}
