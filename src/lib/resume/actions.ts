"use server";

import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { withinProAiBudget } from "@/lib/ai/career-context";
import { buildTailoredResume, type TailoredResume } from "@/lib/resume/tailored-resume";

export async function generateTailoredResumeDocAction(
  opportunityId: string,
): Promise<{ data: TailoredResume } | { error: string }> {
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

  try {
    const resume = await buildTailoredResume(profile, opp.job);
    if (!resume) return { error: "Couldn't build the resume right now. Please try again." };
    return { data: resume };
  } catch (error) {
    console.error("[workly:resume] build failed:", error);
    return { error: "Couldn't build the resume right now. Please try again." };
  }
}
