import "server-only";

import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { listDiscoveredJobsByUserId, updateDiscoveredJobScore } from "@/lib/db/discovery";
import { aiScreeningAvailable, evaluateFitBatch, profileFingerprint } from "@/lib/scoring/ai-evaluator";
import { dossierIsUsable } from "@/lib/scoring/screen-core";
import { coverageOf } from "@/lib/scoring/coverage";
import { buildMatchReasons } from "@/lib/discovery/run";
import { pickScreenCandidates } from "@/lib/discovery/screen-pick";
import type { DiscoveredJob, Job } from "@/lib/db/types";

/**
 * THE DEEP SCREEN - the grounded AI read of the user's top matches, run in
 * its own request after discovery has saved the listings.
 *
 * Discovery has one 60-second request to search every source AND screen
 * results, and ingest usually eats most of it: in practice one or two
 * listings got read properly and the rest kept thin rules-engine reasons
 * ("You match 1 of 1 listed skills: python"). Splitting the screen out
 * gives it a full request of its own, aimed at exactly the listings the
 * user sees first (see screen-pick.ts). The page calls it again while
 * there are unscreened top matches left.
 */

export interface DeepScreenResult {
  available: boolean;
  screened: number;
  /** Top matches still unread after this call. */
  remaining: number;
}

function toJobLike(job: DiscoveredJob): Job {
  return {
    id: `discovered:${job.externalId}`,
    userId: job.userId,
    inputMethod: "PASTED_TEXT",
    url: job.sourceUrl,
    rawInput: job.description ?? "",
    status: "PARSED",
    errorMessage: null,
    title: job.title,
    company: job.company,
    location: job.location,
    country: job.country,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    employmentType: job.employmentType,
    workMode: job.workMode,
    seniority: job.seniority,
    description: job.description,
    requiredExperienceYears: null,
    preferredExperienceYears: null,
    education: null,
    industry: job.industry,
    deadline: null,
    datePosted: job.postedAt,
    source: null,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    requirements: job.requirements,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function loadContext(userId: string) {
  const [profile, careerGoal, jobs] = await Promise.all([
    getFullCareerProfile(userId),
    getPrimaryCareerGoal(userId),
    listDiscoveredJobsByUserId(userId),
  ]);
  const fingerprint = profileFingerprint(profile, careerGoal);
  const targets = [
    careerGoal?.primaryTargetRole,
    careerGoal?.targetRole,
    ...(careerGoal?.secondaryTargetRoles ?? []),
    profile.profile?.currentRole,
    profile.experiences.find((e) => e.isCurrent)?.title,
  ];
  return { profile, careerGoal, jobs, fingerprint, targets };
}

/** How many of the user's top matches haven't been read in full yet - drives the page's auto-screen. */
export async function unscreenedTopCount(userId: string, window = 15): Promise<number> {
  if (!aiScreeningAvailable()) return 0;
  const { profile, jobs, fingerprint, targets } = await loadContext(userId);
  if (!dossierIsUsable(profile)) return 0;
  return pickScreenCandidates(jobs, { targets, fingerprint, limit: 0, window }).remaining;
}

export async function screenTopDiscovered(
  userId: string,
  options: { limit?: number; window?: number; budgetMs?: number; concurrency?: number } = {},
): Promise<DeepScreenResult> {
  if (!aiScreeningAvailable()) return { available: false, screened: 0, remaining: 0 };

  const { profile, careerGoal, jobs, fingerprint, targets } = await loadContext(userId);
  if (!dossierIsUsable(profile)) return { available: false, screened: 0, remaining: 0 };

  const { toScreen, remaining } = pickScreenCandidates(jobs, {
    targets,
    fingerprint,
    limit: options.limit ?? 10,
    window: options.window ?? 15,
  });
  if (toScreen.length === 0) return { available: true, screened: 0, remaining };

  const outcomes = await evaluateFitBatch(toScreen, (job) => ({ profile, careerGoal, job: toJobLike(job) }), {
    concurrency: options.concurrency ?? 5,
    budgetMs: options.budgetMs ?? 45_000,
  });

  let screened = 0;
  for (const job of toScreen) {
    const fit = outcomes.get(job)?.analysis;
    if (!fit || fit.method !== "ai-screen") continue;
    // Keep what the screen doesn't replace: why it was found, remote, source.
    const kept = (job.matchReasons ?? []).filter((r) => r.kind === "expansion");
    const fresh = buildMatchReasons(
      { workMode: job.workMode },
      fit,
      null,
      job.sourceName,
      profile.profile?.openToRemote ?? true,
      fingerprint,
    );
    await updateDiscoveredJobScore(job.id, {
      fitScore: fit.fitScore,
      fitCoverage: coverageOf(fit.scoreBreakdown),
      recommendation: fit.recommendation,
      matchReasons: [...fresh.filter((r) => r.kind !== "source"), ...kept, ...fresh.filter((r) => r.kind === "source")],
    });
    screened++;
  }

  // Anything that timed out is still unscreened and still in the window.
  return { available: true, screened, remaining: remaining + (toScreen.length - screened) };
}
