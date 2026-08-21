import "server-only";

import { listOpportunitiesByUserId, getOpportunityById } from "@/lib/db/opportunities";
import { getJobById } from "@/lib/db/jobs";
import { getJobAnalysisById } from "@/lib/db/job-analyses";
import type { OpportunityWithJob } from "@/lib/db/types";

/**
 * Single place that stitches an Opportunity row together with its Job and
 * JobAnalysis - every list/detail view needs all three, and the dataset
 * per user is small enough (dozens, not thousands, of rows) that N+1
 * lookups are simpler and safer here than a multi-table SQL join with
 * column-name collisions to alias around.
 */
export async function listOpportunitiesWithJobByUserId(userId: string): Promise<OpportunityWithJob[]> {
  const opportunities = await listOpportunitiesByUserId(userId);
  const withJobs = await Promise.all(
    opportunities.map(async (opportunity) => {
      const job = await getJobById(userId, opportunity.jobId);
      if (!job) return null;
      const analysis = opportunity.jobAnalysisId ? await getJobAnalysisById(opportunity.jobAnalysisId) : null;
      return { ...opportunity, job, analysis };
    }),
  );
  return withJobs.filter((o): o is OpportunityWithJob => o !== null);
}

export async function getOpportunityWithJobById(userId: string, id: string): Promise<OpportunityWithJob | null> {
  const opportunity = await getOpportunityById(id);
  if (!opportunity) return null;
  const job = await getJobById(userId, opportunity.jobId);
  if (!job) return null;
  const analysis = opportunity.jobAnalysisId ? await getJobAnalysisById(opportunity.jobAnalysisId) : null;
  return { ...opportunity, job, analysis };
}
