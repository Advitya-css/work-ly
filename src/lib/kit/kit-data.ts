import "server-only";
import { cache } from "react";

import { getFullCareerProfile, type FullCareerProfile } from "@/lib/career/get-full-profile";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { savedForJobWithin } from "@/lib/saved-outputs";
import { matchResume, postingRequirements, untailoredText, type ResumeMatch } from "@/lib/resume/match-score";
import { resumeAsText, type TailoredResume } from "@/lib/resume/tailored-resume-core";

/**
 * Everything the application kit for one job needs, loaded once per
 * request (the kit layout and its page both ask for it).
 */

import { KIT_ITEMS, type KitItem } from "@/lib/kit/kit-items";

/** All of the profile as plain text: what "on your profile" is checked against. */
export function profilePlainText(profile: FullCareerProfile): string {
  return [
    profile.profile?.headline,
    profile.profile?.summary,
    profile.profile?.currentRole,
    ...profile.experiences.map((e) => `${e.title} ${e.company}\n${e.description ?? ""}`),
    ...profile.projects.map((p) => `${p.name}\n${p.description ?? ""}`),
    profile.skills.map((s) => s.name).join(", "),
    ...profile.certifications.map((c) => c.name),
    ...profile.educations.map((e) => [e.degree, e.fieldOfStudy, e.institution].filter(Boolean).join(" ")),
  ]
    .filter(Boolean)
    .join("\n");
}

export interface KitMatch {
  now: ResumeMatch;
  /** The same resume in the candidate's own wording, for "up from". */
  before: number;
  required: string[];
  preferred: string[];
  profileText: string;
  baselineText: string;
}

export const loadKit = cache(async (userId: string, opportunityId: string) => {
  const opportunity = await getOpportunityWithJobById(userId, opportunityId);
  if (!opportunity || opportunity.userId !== userId) return null;
  const [profile, saved] = await Promise.all([
    getFullCareerProfile(userId),
    savedForJobWithin(userId, [...KIT_ITEMS], opportunityId, 1500),
  ]);

  const ready = Object.fromEntries(KIT_ITEMS.map((k) => [k, Boolean(saved[k])])) as Record<KitItem, boolean>;

  let match: KitMatch | null = null;
  const resume = saved.resume?.data as TailoredResume | undefined;
  const { required, preferred } = postingRequirements(opportunity.job);
  if (required.length + preferred.length > 0) {
    const profileText = profilePlainText(profile);
    const fallback = { name: "", headline: null, contact: "" };
    const baselineText = resume
      ? untailoredText(resume, { summary: profile.profile?.summary ?? null, skills: profile.skills.map((s) => s.name) })
      : "";
    if (resume) {
      const now = matchResume({ required, preferred, resumeText: resumeAsText(resume, fallback), profileText });
      const before = matchResume({ required, preferred, resumeText: baselineText, profileText }).score;
      match = { now, before, required, preferred, profileText, baselineText };
    }
  }

  return { opportunity, job: opportunity.job, profile, saved, ready, match };
});
