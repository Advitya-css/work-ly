import "server-only";

import { safeMessage } from "@/lib/errors";

import { jobParsingProvider } from "@/lib/ai/job-parser";
import { checkAuthenticity } from "@/lib/validation/document-authenticity";
import { groundJobExtraction } from "@/lib/ai/grounding";
import { scoringProvider } from "@/lib/scoring";
import { priorityProvider } from "@/lib/priority";
import {
  createJob,
  findParsedJobByRawInput,
  getJobById,
  markJobFailed,
  saveJobParseResult,
} from "@/lib/db/jobs";
import { getJobAnalysisByJobId, saveJobAnalysis } from "@/lib/db/job-analyses";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { getOpportunityByJobId, upsertOpportunityForJob } from "@/lib/db/opportunities";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { fetchJobPostingText } from "@/lib/jobs/fetch-url";
import type { Job, JobAnalysis, JobInputMethod, Opportunity } from "@/lib/db/types";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface SubmitJobInput {
  inputMethod: JobInputMethod;
  /** Raw pasted text (PASTED_TEXT) or the URL to fetch (URL). */
  text?: string;
  url?: string;
}

/**
 * Step 1 of the pipeline: create the Job row and populate its raw input -
 * either the user's pasted text, or text fetched from their URL via a
 * plain, unauthenticated request (see fetch-url.ts). Never scrapes past a
 * login wall or bot-detection; if the fetch fails, the caller is told to
 * paste the description instead rather than this function trying harder.
 */
export async function submitJob(userId: string, input: SubmitJobInput): Promise<{ job: Job } | { error: string }> {
  let rawInput: string;
  let url: string | null = null;

  if (input.inputMethod === "URL") {
    const trimmedUrl = (input.url ?? "").trim();
    if (!trimmedUrl) return { error: "Please enter a URL." };
    const fetched = await fetchJobPostingText(trimmedUrl);
    if (!fetched.ok || !fetched.text) {
      return { error: fetched.error ?? "Couldn't retrieve that page. Please paste the job description instead." };
    }
    rawInput = fetched.text;
    url = trimmedUrl;
  } else {
    const trimmedText = (input.text ?? "").trim();
    if (trimmedText.length < 50) {
      return { error: "That doesn't look like a full job description. Please paste more of it." };
    }
    rawInput = trimmedText;
  }

  // Is this actually a job posting? A blank page, a cookie banner scraped
  // from a URL, or an accidental paste would otherwise be parsed into a
  // job with no requirements, and every profile then scored against it
  // would produce confident numbers about nothing.
  const authenticity = checkAuthenticity(rawInput, "job-posting");
  if (authenticity.verdict === "reject") {
    return { error: authenticity.message };
  }

  const job = await createJob(userId, { inputMethod: input.inputMethod, url, rawInput });
  return { job };
}

/** Step 2: parse the raw text into structured fields (AI or heuristic - see lib/ai/job-parser.ts). */
export async function parseJob(jobId: string, userId: string): Promise<Job> {
  const job = await getJobById(jobId);
  if (!job || job.userId !== userId) throw new Error("Job not found.");

  try {
    const rawExtracted = await jobParsingProvider.parseJob(job.rawInput);

    // Drop anything the extractor produced that is not actually in the
    // posting. A hallucinated required skill becomes a gap the user is told
    // to close, and a hallucinated salary becomes a number they make
    // decisions on.
    const grounding = groundJobExtraction(rawExtracted, job.rawInput);
    const extracted = grounding.grounded;

    if (grounding.dropped.length > 0) {
      console.warn(
        `[workly:grounding] dropped ${grounding.dropped.length} unverifiable claim(s) from a job extraction ` +
          `(grounded ${Math.round(grounding.groundedRatio * 100)}%): ` +
          grounding.dropped.slice(0, 8).map((d) => `${d.field}="${d.value}"`).join(", "),
      );
    }

    return await saveJobParseResult(jobId, {
      title: extracted.title,
      company: extracted.company,
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
      source: job.inputMethod === "URL" ? new URL(job.url ?? "").hostname : "Pasted by user",
      requiredSkills: extracted.requiredSkills,
      preferredSkills: extracted.preferredSkills,
      requirements: extracted.requirements,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parsing failed.";
    await markJobFailed(jobId, message);
    throw error;
  }
}

/** Step 3: compare the parsed Job against the user's CareerProfile + primary CareerGoal and persist the analysis. */
export async function analyzeJob(jobId: string, userId: string): Promise<JobAnalysis> {
  const job = await getJobById(jobId);
  if (!job || job.userId !== userId) throw new Error("Job not found.");
  if (job.status !== "PARSED") throw new Error("This job hasn't finished parsing yet.");

  const [profile, careerGoal] = await Promise.all([
    getFullCareerProfile(userId),
    getPrimaryCareerGoal(userId),
  ]);

  const result = scoringProvider.analyzeFit({ profile, careerGoal, job });

  return saveJobAnalysis(userId, jobId, result);
}

/**
 * Step 4: every analyzed job becomes (or re-syncs) a trackable Opportunity.
 * Priority is computed here - separately from Fit, using the JobAnalysis
 * that was just saved plus the user's CareerGoal/profile - and snapshotted
 * onto the Opportunity row alongside Fit so the /opportunities list can
 * sort/filter without re-deriving either score per request.
 */
export async function syncOpportunityForJob(jobId: string, userId: string): Promise<Opportunity> {
  const job = await getJobById(jobId);
  if (!job || job.userId !== userId) throw new Error("Job not found.");

  const [profile, careerGoal] = await Promise.all([
    getFullCareerProfile(userId),
    getPrimaryCareerGoal(userId),
  ]);

  const analysis = await getJobAnalysisByJobId(jobId);
  if (!analysis) throw new Error("This job hasn't been analyzed yet.");

  const { priorityScore, priorityBreakdown } = priorityProvider.computePriority({ profile, careerGoal, job, analysis });

  return upsertOpportunityForJob(userId, jobId, {
    jobAnalysisId: analysis.id,
    fitScore: analysis.fitScore,
    recommendation: analysis.recommendation,
    competitiveness: analysis.competitiveness,
    priorityScore,
    priorityBreakdown,
  });
}

/**
 * The full pipeline in one call: submit -> parse -> analyze -> sync
 * opportunity. Used by the /analyze-job form.
 *
 * COST CONTROL: before creating anything, checks whether this user has
 * already analyzed byte-identical text. Job parsing is one of only two
 * paths that calls a model, and re-submitting the same posting is common
 * and accidental - a double-clicked button, a browser back-and-resubmit,
 * or pasting the same job the discovery feed already surfaced. Each of
 * those previously bought a fresh AI call and left a duplicate opportunity
 * in the pipeline.
 *
 * Matching on exact raw input is deliberately conservative: two postings
 * that differ by even a character are treated as distinct, because they
 * might genuinely be (an updated salary, a changed deadline). This catches
 * the accidental-resubmit case without ever silently merging two jobs the
 * user meant to keep apart.
 */
export async function submitParseAndAnalyzeJob(
  userId: string,
  input: SubmitJobInput,
): Promise<{ jobId: string; opportunityId: string; reused?: boolean } | { error: string }> {
  const candidateText = input.inputMethod === "PASTED_TEXT" ? (input.text ?? "").trim() : null;
  if (candidateText && candidateText.length >= 50) {
    const existing = await findParsedJobByRawInput(userId, candidateText);
    if (existing) {
      const opportunity = await getOpportunityByJobId(existing.id);
      if (opportunity) {
        return { jobId: existing.id, opportunityId: opportunity.id, reused: true };
      }
      // Job exists but its opportunity was deleted - rebuild just that,
      // still without re-parsing or re-calling the model.
      try {
        const rebuilt = await syncOpportunityForJob(existing.id, userId);
        return { jobId: existing.id, opportunityId: rebuilt.id, reused: true };
      } catch {
        // Fall through to a normal fresh submission.
      }
    }
  }

  const submitted = await submitJob(userId, input);
  if ("error" in submitted) return submitted;

  try {
    await parseJob(submitted.job.id, userId);
    await analyzeJob(submitted.job.id, userId);
    const opportunity = await syncOpportunityForJob(submitted.job.id, userId);
    return { jobId: submitted.job.id, opportunityId: opportunity.id };
  } catch (error) {
    // Sanitized: this string is rendered to the user, so a driver or AI
    // error must never reach it verbatim. See lib/errors.ts.
    return { error: safeMessage(error, "submitParseAndAnalyzeJob", "Something went wrong while analyzing this job.") };
  }
}
