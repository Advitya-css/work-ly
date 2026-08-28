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
 * 0.40 is a judgement call and worth stating plainly rather than burying.
 * This has moved twice: an original 0.6 withheld scores for plenty of
 * entry-level roles where most components are legitimately "assumed"
 * rather than "measured" (thin CVs, junior postings with few stated
 * requirements), so it was lowered to 0.25 - then raised back up to 0.40
 * after 0.25 let a handful of edge-case, almost-entirely-assumed low-data
 * jobs through with scores that looked more confident than the underlying
 * data justified. 0.40 is the current balance between those two failure
 * modes - see tests/fit-priority-edge-cases.test.ts for the regression
 * guard on this exact threshold - and if it moves again, that guard should
 * be updated deliberately, not left silently failing.
 */
export const MIN_COVERAGE_FOR_SCORE = 0.40;

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

/**
 * Rounds one component's score for display only.
 *
 * `component()`/`assumed()` in lib/scoring/shared.ts deliberately keep a
 * component's `score` at full floating-point precision - summing several
 * rounded components before dividing by the measured weight used to
 * inflate a total by two or three points against the same components
 * summed at full precision, enough to cross a competitiveness or
 * recommendation threshold, so rounding must happen once, at the very end
 * of that calculation (see totalFrom).
 *
 * But that precision was leaking straight onto the page: a ratio like
 * 0.9499999999999998 (ordinary floating-point arithmetic, not a bug) times
 * a weight of 15 renders as "14.249999999999998/25" in a breakdown card,
 * which reads as broken regardless of how accurate the underlying number
 * is. This is purely a presentation step - callers must keep using the
 * un-rounded `ScoreComponent` for any further math (percentages, sums,
 * threshold checks) and only round at the last moment, right before
 * rendering.
 */
export function roundForDisplay(score: number): number {
  return Math.round(score * 10) / 10;
}
