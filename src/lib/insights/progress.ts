import "server-only";

import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { getDreamJobById } from "@/lib/db/dream-jobs";
import { recordReadinessSnapshot } from "@/lib/db/readiness-snapshots";
import { dreamJobToJobLike } from "@/lib/dream-job/to-job-like";
import { computeProgress, getActiveFullPathway } from "@/lib/pathway/get-full-pathway";
import { evaluateFit } from "@/lib/scoring/ai-evaluator";
import { coverageOf } from "@/lib/scoring/coverage";

/** Completed pathway steps right now - stored with each snapshot so the chart can say what moved it. */
export async function completedStepsNow(userId: string): Promise<number | null> {
  const pathway = await getActiveFullPathway(userId).catch(() => null);
  return pathway ? computeProgress(pathway).completed : null;
}

/**
 * The monthly re-check: re-scores readiness for a dream job against the
 * profile as it is today (one screening call - the same Candidate Fit
 * calculation the full analysis uses) and records it. The full gap list
 * isn't rebuilt; that's what re-running the analysis is for.
 */
export async function recheckReadiness(userId: string, dreamJobId: string): Promise<number | null> {
  const dreamJob = await getDreamJobById(dreamJobId);
  if (!dreamJob || dreamJob.userId !== userId || dreamJob.status !== "PARSED") return null;
  const [profile, careerGoal, steps] = await Promise.all([
    getFullCareerProfile(userId),
    getPrimaryCareerGoal(userId),
    completedStepsNow(userId),
  ]);
  const { analysis } = await evaluateFit({ profile, careerGoal, job: dreamJobToJobLike(dreamJob) }, { timeoutMs: 40_000 });
  await recordReadinessSnapshot({
    userId,
    dreamJobId,
    readinessScore: analysis.fitScore,
    coverage: coverageOf(analysis.scoreBreakdown),
    source: "monthly",
    stepsCompleted: steps,
  });
  return analysis.fitScore;
}
