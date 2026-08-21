import "server-only";

import { safeMessage } from "@/lib/errors";

import { jobParsingProvider } from "@/lib/ai/job-parser";
import { scoringProvider } from "@/lib/scoring";
import {
  createDreamJob,
  getDreamJobById,
  markDreamJobFailed,
  saveDreamJobParseResult,
} from "@/lib/db/dream-jobs";
import { saveDreamJobAnalysis } from "@/lib/db/dream-job-analyses";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { dreamJobToJobLike } from "@/lib/dream-job/to-job-like";
import { buildGapAnalysis } from "@/lib/dream-job/gap-engine";
import type { DreamJob, DreamJobAnalysis } from "@/lib/db/types";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface SubmitDreamJobInput {
  dreamRole: string;
  description: string;
  companyName?: string;
  portfolio?: string;
}

/** Step 1: create the DreamJob row from the user's pasted target-job description. */
export async function submitDreamJob(
  userId: string,
  input: SubmitDreamJobInput,
): Promise<{ dreamJob: DreamJob } | { error: string }> {
  const dreamRole = input.dreamRole.trim();
  const description = input.description.trim();
  if (!dreamRole) return { error: "Tell us the role you're aiming for." };
  if (description.length < 50) {
    return { error: "That doesn't look like a full job description. Please paste more of it." };
  }

  const dreamJob = await createDreamJob(userId, {
    dreamRole,
    companyName: input.companyName?.trim() || null,
    portfolio: input.portfolio?.trim() || null,
    rawInput: description,
  });
  return { dreamJob };
}

/** Step 2: parse the pasted description into structured fields - reuses the exact same extraction used for real postings. */
export async function parseDreamJob(dreamJobId: string, userId: string): Promise<DreamJob> {
  const dreamJob = await getDreamJobById(dreamJobId);
  if (!dreamJob || dreamJob.userId !== userId) throw new Error("Dream job not found.");

  try {
    const extracted = await jobParsingProvider.parseJob(dreamJob.rawInput);
    return await saveDreamJobParseResult(dreamJobId, {
      title: extracted.title ?? dreamJob.dreamRole,
      company: extracted.company ?? dreamJob.companyName,
      location: extracted.location,
      country: extracted.country,
      salaryMin: extracted.salaryMin,
      salaryMax: extracted.salaryMax,
      salaryCurrency: extracted.salaryCurrency,
      employmentType: extracted.employmentType,
      workMode: extracted.workMode,
      seniority: extracted.seniority,
      description: extracted.description,
      requiredExperienceYears: extracted.requiredExperienceYears,
      preferredExperienceYears: extracted.preferredExperienceYears,
      education: extracted.education,
      industry: extracted.industry,
      deadline: parseDate(extracted.deadline),
      datePosted: parseDate(extracted.datePosted),
      source: "Pasted by user",
      requiredSkills: extracted.requiredSkills,
      preferredSkills: extracted.preferredSkills,
      requirements: extracted.requirements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parsing failed.";
    await markDreamJobFailed(dreamJobId, message);
    throw error;
  }
}

/**
 * Step 3: compute Readiness (Fit, relabeled - see to-job-like.ts) and run
 * the deterministic Gap Engine, grounding gap-priority "N opportunities"
 * claims in the user's real, already-tracked Opportunities.
 */
export async function analyzeDreamJob(dreamJobId: string, userId: string): Promise<DreamJobAnalysis> {
  const dreamJob = await getDreamJobById(dreamJobId);
  if (!dreamJob || dreamJob.userId !== userId) throw new Error("Dream job not found.");
  if (dreamJob.status !== "PARSED") throw new Error("This dream job hasn't finished parsing yet.");

  const [profile, careerGoal, opportunities] = await Promise.all([
    getFullCareerProfile(userId),
    getPrimaryCareerGoal(userId),
    listOpportunitiesWithJobByUserId(userId),
  ]);

  const dreamJobLike = dreamJobToJobLike(dreamJob);
  const fit = scoringProvider.analyzeFit({ profile, careerGoal, job: dreamJobLike });
  const gapAnalysis = buildGapAnalysis({ dreamJobLike, fit, profile, opportunities });

  return saveDreamJobAnalysis(userId, dreamJobId, {
    readinessScore: fit.fitScore,
    competitiveness: fit.competitiveness,
    scoreBreakdown: fit.scoreBreakdown,
    strengths: fit.strengths,
    weaknesses: fit.weaknesses,
    gaps: fit.gaps,
    mandatoryRequirements: fit.mandatoryRequirements,
    preferredRequirements: fit.preferredRequirements,
    ...gapAnalysis,
  });
}

/** The full pipeline in one call: submit -> parse -> analyze. Used by the /dream-job form. */
export async function submitAndAnalyzeDreamJob(
  userId: string,
  input: SubmitDreamJobInput,
): Promise<{ dreamJobId: string } | { error: string }> {
  const submitted = await submitDreamJob(userId, input);
  if ("error" in submitted) return submitted;

  try {
    await parseDreamJob(submitted.dreamJob.id, userId);
    await analyzeDreamJob(submitted.dreamJob.id, userId);
    return { dreamJobId: submitted.dreamJob.id };
  } catch (error) {
    return { error: safeMessage(error, "submitAndAnalyzeDreamJob", "Something went wrong while analyzing your dream job.") };
  }
}
