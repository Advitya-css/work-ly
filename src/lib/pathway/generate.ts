import "server-only";

import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { getDreamJobAnalysisByDreamJobId } from "@/lib/db/dream-job-analyses";
import { replaceActivePathway } from "@/lib/db/career-pathways";
import { buildPathway } from "@/lib/pathway/build-pathway";
import { enhancePathwayWithActionablePlans } from "@/lib/ai/pathway-planner";
import type { CareerPathway } from "@/lib/db/types";

/**
 * Generates (or regenerates) the user's active pathway.
 *
 * Source of truth for the target is, in order:
 *   1. Their most recent analyzed DreamJob - best case, carries a full
 *      ranked gap analysis to sequence into steps.
 *   2. Their primary CareerGoal - thinner, since there's no gap analysis;
 *      the pathway then mostly says "give me more to work with".
 *
 * Returns an explanatory error rather than an empty pathway when there's
 * genuinely nothing to build from, so the UI can tell the user what to do
 * next instead of showing a convincing but hollow route.
 */
export async function generatePathway(
  userId: string,
  options: { dreamJobId?: string } = {},
): Promise<{ pathway: CareerPathway } | { error: string }> {
  const [profile, careerGoal, opportunities, dreamJobs] = await Promise.all([
    getFullCareerProfile(userId),
    getPrimaryCareerGoal(userId),
    listOpportunitiesWithJobByUserId(userId),
    listDreamJobsByUserId(userId),
  ]);

  const parsedDreamJobs = dreamJobs.filter((d) => d.status === "PARSED");
  const dreamJob = options.dreamJobId
    ? parsedDreamJobs.find((d) => d.id === options.dreamJobId) ?? null
    : parsedDreamJobs[0] ?? null;

  const analysis = dreamJob ? await getDreamJobAnalysisByDreamJobId(dreamJob.id) : null;

  const hasTarget = Boolean(
    dreamJob || careerGoal?.primaryTargetRole || careerGoal?.targetRole || careerGoal?.title,
  );
  if (!hasTarget) {
    return {
      error:
        "Work-ly needs a target before it can build a pathway. Analyze a dream job, or set a career goal with a target role.",
    };
  }

  if (!profile.profile && profile.experiences.length === 0 && profile.skills.length === 0) {
    return {
      error:
        "Your career profile is empty, so there's nothing to measure a pathway from. Add your experience and skills first.",
    };
  }

  let input = buildPathway({
    profile,
    careerGoal,
    opportunities,
    dreamJob: dreamJob ? { id: dreamJob.id, title: dreamJob.title, dreamRole: dreamJob.dreamRole } : null,
    analysis,
  });

  const target =
    dreamJob?.title?.trim() ||
    dreamJob?.dreamRole?.trim() ||
    careerGoal?.primaryTargetRole?.trim() ||
    "Your target role";

  input = await enhancePathwayWithActionablePlans(input, profile, target);

  const pathway = await replaceActivePathway(userId, input);
  return { pathway };
}
