import type { ScoreComponent } from "@/lib/db/types";

/**
 * Any object whose values are score components.
 *
 * Deliberately structural rather than `Record<string, ScoreComponent>`:
 * ScoreBreakdown and PriorityBreakdown are fixed-key interfaces with no
 * index signature, so a Record parameter forced a cast at every call
 * site, and casts are exactly where type errors hide.
 */
export type ComponentMap = { [key: string]: ScoreComponent };

/**
 * Coverage: how much of a score's weighting was actually measurable.
 *
 * Deliberately in its own file with no `server-only` import, because both
 * the engines (server) and the display components need it, and the
 * threshold has to be the same number in both places. A UI that showed a
 * headline figure the engine considered unreliable would defeat the point
 * of computing reliability at all.
 */

/**
 * Below this, no score is shown.
 *
 * 0.6 is a judgement call and worth stating plainly rather than burying.
 * With under 60% of the weighting measurable, the components that remain
 * are not a fair summary of anyone. "41/100" derived from two of seven
 * criteria is a precise number that means almost nothing, and precision is
 * what makes a bad number persuasive.
 */
export const MIN_COVERAGE_FOR_SCORE = 0.6;

/**
 * Derives coverage from a stored breakdown.
 *
 * Computed at display time rather than persisted, so no migration is needed
 * and no stored column can drift out of sync with the breakdown it
 * describes.
 *
 * Analyses saved before evidence-gating existed have no `confidence` on any
 * component. Those are treated as fully covered, which reproduces the old
 * behaviour for old rows rather than retroactively marking historic
 * analyses unreliable on evidence we do not actually have about them. They
 * are refreshed to the new rules the next time the job is re-analyzed.
 */
export function coverageOf(breakdown: ComponentMap): number {
  const components = Object.values(breakdown);
  if (components.length === 0) return 0;

  const anyLabelled = components.some((c) => c.confidence != null);
  if (!anyLabelled) return 1;

  let measurable = 0;
  let total = 0;
  for (const c of components) {
    total += c.maxScore;
    if (c.confidence !== "unavailable") measurable += c.maxScore;
  }
  return total > 0 ? measurable / total : 0;
}

/** Which components could not be assessed, by key. */
export function unassessedIn(breakdown: ComponentMap): string[] {
  return Object.entries(breakdown)
    .filter(([, c]) => c.confidence === "unavailable")
    .map(([key]) => key);
}

export function isReliable(breakdown: ComponentMap): boolean {
  return coverageOf(breakdown) >= MIN_COVERAGE_FOR_SCORE;
}
