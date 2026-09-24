import type { DiscoveredJob } from "@/lib/db/types";
import { fieldWords } from "@/lib/discovery/relevance";
import { freshness, recommendationRank } from "@/lib/discovery/sort";

/**
 * Which discovered jobs get the grounded AI screen next.
 *
 * The screen (lib/scoring/ai-evaluator.ts) is what turns a listing from
 * "You match 1 of 1 listed skills: python" into "You've built 40+ dbt
 * models on BigQuery - the core of this role - but haven't shown Airflow".
 * It costs one model call per job, so it has to be spent on the listings
 * the user will actually read: the ones at the top of their feed.
 *
 * Ranking can't lean on the rules score alone. A listing that arrives as a
 * two-line summary scores low because there's little to match against,
 * not because it's a poor job - "Senior Analytics Engineer at G2" for
 * someone targeting Analytics Engineer. So title affinity to what the user
 * is looking for carries real weight here.
 *
 * Pure: the caller loads the jobs and the targets.
 */

export const MIN_SCREENABLE_TEXT = 120;

function stem(word: string): string {
  return word.length > 5 ? word.slice(0, 5) : word;
}

/** 0-1: the best share of any target's field words that appear in the title. */
export function titleAffinity(title: string, targets: (string | null | undefined)[]): number {
  const titleStems = new Set(fieldWords(title).map(stem));
  let best = 0;
  for (const target of targets) {
    if (!target?.trim()) continue;
    const stems = Array.from(new Set(fieldWords(target).map(stem)));
    if (stems.length === 0) continue;
    const share = stems.filter((s) => titleStems.has(s)).length / stems.length;
    if (share > best) best = share;
  }
  return best;
}

export function isScreenedFor(job: Pick<DiscoveredJob, "matchReasons">, fingerprint: string): boolean {
  return (job.matchReasons ?? []).some((r) => r.kind === "screen" && r.meta === fingerprint);
}

export function screenPriority(job: DiscoveredJob, targets: (string | null | undefined)[], now = Date.now()): number {
  const tier = Math.max(recommendationRank(job.recommendation), 0);
  return tier * 20 + (job.fitScore ?? 40) * 0.5 + titleAffinity(job.title, targets) * 35 + freshness(job, now) * 10;
}

export interface ScreenPick {
  toScreen: DiscoveredJob[];
  /** Unscreened jobs still inside the window after this batch. */
  remaining: number;
}

/**
 * The top `window` listings by screenPriority are "what the user sees
 * first"; up to `limit` of those not yet screened against this profile
 * are returned for screening. Listings with too little text to read, the
 * dismissed and the duplicates are skipped.
 */
export function pickScreenCandidates(
  jobs: DiscoveredJob[],
  options: {
    targets: (string | null | undefined)[];
    fingerprint: string;
    limit: number;
    window?: number;
    now?: number;
  },
): ScreenPick {
  const window = options.window ?? 15;
  const eligible = jobs.filter(
    (job) =>
      !job.isDismissed &&
      !job.duplicateOfId &&
      job.recommendation !== "SKIP" &&
      (job.description?.trim().length ?? 0) >= MIN_SCREENABLE_TEXT,
  );
  const ranked = eligible
    .map((job) => ({ job, priority: screenPriority(job, options.targets, options.now) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, window)
    .map((r) => r.job);
  const unscreened = ranked.filter((job) => !isScreenedFor(job, options.fingerprint));
  const toScreen = unscreened.slice(0, Math.max(0, options.limit));
  return { toScreen, remaining: unscreened.length - toScreen.length };
}
