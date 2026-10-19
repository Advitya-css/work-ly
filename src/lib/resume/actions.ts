"use server";

import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { withinProAiBudget } from "@/lib/ai/career-context";
import { buildTailoredResume, type TailoredResume } from "@/lib/resume/tailored-resume";
import { getApplicationByOpportunityId, updateApplication } from "@/lib/db/applications";
import { TAILORED_CV_LABEL } from "@/lib/applications/cv-version";
import { recordUsage } from "@/lib/usage";
import { saveOutput } from "@/lib/saved-outputs";
import { cleanEditedResume } from "@/lib/resume/tailored-resume-core";

export async function generateTailoredResumeDocAction(
  opportunityId: string,
): Promise<{ data: TailoredResume; savedAt: string | null } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.isPro) return { error: "The tailored resume is a Pro feature." };
  if (!(await withinProAiBudget(user.id))) {
    return { error: "You've used a lot of AI tools this hour. Try again in a little while." };
  }

  const [profile, opp] = await Promise.all([
    getFullCareerProfile(user.id),
    getOpportunityWithJobById(user.id, opportunityId),
  ]);
  if (!opp || opp.userId !== user.id) return { error: "Opportunity not found." };
  if (profile.experiences.length === 0 && profile.projects.length === 0) {
    return { error: "Add your experience (or upload your resume) first. There's nothing to tailor yet." };
  }
  await recordUsage(user.id, "tailor");

  try {
    const resume = await buildTailoredResume(profile, opp.job);
    if (!resume) return { error: "Couldn't build the resume right now. Please try again." };
    // Kept, so opening it again is instant and doesn't spend another build.
    const savedAt = await saveOutput(user.id, "resume", opportunityId, resume);
    // Record which CV went out, so outcomes can later be compared tailored
    // vs not. Only fills a blank - never overwrites what the user entered.
    try {
      const application = await getApplicationByOpportunityId(opportunityId);
      if (application && application.userId === user.id && !application.cvVersion?.trim()) {
        await updateApplication(application.id, { cvVersion: TAILORED_CV_LABEL });
      }
    } catch (error) {
      console.warn("[workly:resume] could not tag the application's CV version:", error);
    }
    return { data: resume, savedAt };
  } catch (error) {
    console.error("[workly:resume] build failed:", error);
    return { error: "Couldn't build the resume right now. Please try again." };
  }
}

/** Saves the user's own edits to a tailored resume, so they survive a refresh. */
export async function saveTailoredResumeEditsAction(
  opportunityId: string,
  edited: unknown,
): Promise<{ savedAt: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!user.isPro) return { error: "The tailored resume is a Pro feature." };
  const opp = await getOpportunityWithJobById(user.id, opportunityId);
  if (!opp || opp.userId !== user.id) return { error: "Opportunity not found." };
  const resume = cleanEditedResume(edited);
  if (!resume) return { error: "Couldn't save that. Please try again." };
  const savedAt = await saveOutput(user.id, "resume", opportunityId, resume, { edited: true });
  return savedAt ? { savedAt } : { error: "Couldn't save your edits. Copy them somewhere safe and try again." };
}
