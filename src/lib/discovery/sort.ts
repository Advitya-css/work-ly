import type { DiscoveredJob } from "@/lib/db/types";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";

/**
 * DISCOVERY RANKING
 *
 * Tier first (Apply Now > Strong > Stretch > everything else), so the list
 * never contradicts the bucket counts shown above it. Inside a tier, the
 * old tiebreaker was the search engine's lexical "relevance" blend, which
 * ignores the fit score entirely - two Strong jobs at Fit 88 and Fit 61
 * could come out in either order depending on shared vocabulary. The
 * tiebreaker is now `matchStrength`: mostly fit, then freshness, then
 * relevance, with a small bonus for a job the grounded AI screen has
 * actually read against the profile.
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Age in days of a listing: its posting date when known, otherwise when Work-ly first saw it. */
export function listingAgeDays(job: Pick<DiscoveredJob, "postedAt" | "discoveredAt">, now = Date.now()): number {
  const when = new Date(job.postedAt ?? job.discoveredAt).getTime();
  if (!Number.isFinite(when)) return 30;
  return Math.max(0, (now - when) / DAY_MS);
}

/**
 * 1.0 for a listing posted today, ~0.5 at two weeks, ~0.2 at a month.
 * Applying early matters: many postings get most of their applicants in the
 * first days, so a strong match posted yesterday beats an equal one from
 * last month.
 */
export function freshness(job: Pick<DiscoveredJob, "postedAt" | "discoveredAt">, now = Date.now()): number {
  return Math.exp(-listingAgeDays(job, now) / 20);
}

export function isAiScreened(job: Pick<DiscoveredJob, "matchReasons">): boolean {
  return Array.isArray(job.matchReasons) && job.matchReasons.some((r) => r.kind === "screen");
}

/**
 * 0-1. Fit dominates when it is reliable; when coverage is too thin to trust
 * the number, relevance carries more of the weight instead of an
 * unreliable fit figure deciding the order.
 */
export function matchStrength(job: DiscoveredJob, relevance: number, now = Date.now()): number {
  const fitReliable = job.fitScore != null && (job.fitCoverage == null || job.fitCoverage >= MIN_COVERAGE_FOR_SCORE);
  const fit = job.fitScore != null ? job.fitScore / 100 : 0.4;
  const fresh = freshness(job, now);
  const rel = Math.max(0, Math.min(1, relevance));
  const screenedBonus = isAiScreened(job) ? 0.04 : 0;
  return fitReliable
    ? 0.62 * fit + 0.2 * fresh + 0.18 * rel + screenedBonus
    : 0.35 * fit + 0.25 * fresh + 0.4 * rel;
}

/**
 * The "Top Matches (For You)" sort: recommendation tier first, then match
 * strength. Never lets a job Work-ly has itself bucketed as low priority
 * outrank one it has recommended.
 */
export function comparePriority(
  a: { job: DiscoveredJob; score: number },
  b: { job: DiscoveredJob; score: number },
): number {
  const rankDiff = recommendationRank(b.job.recommendation) - recommendationRank(a.job.recommendation);
  if (rankDiff !== 0) return rankDiff;
  return matchStrength(b.job, b.score) - matchStrength(a.job, a.score);
}

/**
 * Listings too old to be worth an application. A job posted more than
 * `maxAgeDays` ago (or, with no posting date, first seen that long ago) is
 * very likely filled or a zombie repost, and showing it wastes the one
 * thing a job seeker can't get back. Converted (tracked) jobs are always
 * kept - the user chose those.
 */
export function isStale(job: Pick<DiscoveredJob, "postedAt" | "discoveredAt" | "convertedOpportunityId">, maxAgeDays = 30, now = Date.now()): boolean {
  if (job.convertedOpportunityId) return false;
  return listingAgeDays(job, now) > maxAgeDays;
}

/** Seen for the first time in the last few days - worth flagging as new. */
export function isNewListing(job: Pick<DiscoveredJob, "discoveredAt">, withinDays = 3, now = Date.now()): boolean {
  const seen = new Date(job.discoveredAt).getTime();
  return Number.isFinite(seen) && now - seen <= withinDays * DAY_MS;
}
