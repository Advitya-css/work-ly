import type { DiscoveredJob } from "@/lib/db/types";

/**
 * Same ordering as BUCKETS in discovery/labels.ts - Apply Now, then Strong,
 * then Stretch, then everything else. "Top Matches (For You)" used to sort
 * purely by the blended relevance score (keyword/structured/semantic/
 * preferences), which treats a job Work-ly couldn't assess ("not enough
 * data, defaulting to Low Priority" - see scoring/providers/stub.ts) as
 * merely neutral rather than actually low-priority, since a sparse job's
 * missing signals fall back to ~0.5 on every component instead of being
 * penalized. On real, messy discovery data that let genuinely
 * low-recommendation jobs (unrelated fields, thin postings) outrank real
 * Strong/Stretch matches - a job explicitly bucketed as Low Priority
 * showing up as the #1 "Top Match" directly above its own bucket counts.
 * Sorting by recommendation tier first, blended score only as a tiebreaker
 * within a tier, keeps the sort consistent with the bucket counts the page
 * shows right above it.
 */
const RECOMMENDATION_RANK: Record<string, number> = {
  APPLY_NOW: 3,
  APPLY: 2,
  STRETCH: 1,
  LOW_PRIORITY: 0,
  SKIP: -1,
};

/** Not yet scored ranks below even an explicit Low Priority - it's unassessed, not merely low-priority. */
export function recommendationRank(recommendation: string | null): number {
  if (recommendation == null) return -2;
  return RECOMMENDATION_RANK[recommendation] ?? -2;
}

/**
 * The "Top Matches (For You)" sort: recommendation tier first (Apply Now >
 * Strong > Stretch > Low Priority/Skip/unscored), the blended relevance
 * score only as a tiebreaker inside a tier. Never lets a job Work-ly has
 * itself bucketed as low priority outrank one it has recommended.
 */
export function comparePriority(
  a: { job: DiscoveredJob; score: number },
  b: { job: DiscoveredJob; score: number },
): number {
  const rankDiff = recommendationRank(b.job.recommendation) - recommendationRank(a.job.recommendation);
  if (rankDiff !== 0) return rankDiff;
  return b.score - a.score;
}
