import "server-only";

import type { CareerGoal, Experience, ScoreComponent, Skill } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

/**
 * Generic matching/estimation primitives shared by both deterministic
 * scoring engines, Fit (lib/scoring) and Priority (lib/priority). Kept in
 * one place so "how many years has this candidate got" or "what seniority
 * level are they at" can never quietly drift between the two answers.
 *
 * ---------------------------------------------------------------------
 * THE CENTRAL RULE: A SCORE MUST NEVER STAND IN FOR MISSING DATA.
 * ---------------------------------------------------------------------
 *
 * Every component used to be forced to return a number. That sounds
 * harmless and is not, because it makes three different situations
 * indistinguishable:
 *
 *   1. We measured this and the answer is genuinely low.
 *   2. We have nothing to measure, so we guessed a middle value.
 *   3. We have nothing to measure, so we returned zero.
 *
 * The user reads all three as "this is your score". Case 3 is the worst:
 * an engineer whose CV import produced no dates was told "You have 0 years
 * of experience, short of the 5-year requirement" and lost a quarter of the
 * available points. That sentence is false, and Workly asserted it with
 * total confidence.
 *
 * So `ScoreComponent` now carries a `confidence`, and a component that
 * could not be measured is marked `unavailable`. An unavailable component
 * is removed from the DENOMINATOR rather than scoring zero against it:
 * missing data reduces how much of the picture we claim to have, it never
 * reduces the person's score. What is left is reported as `coverage`, and
 * below a threshold the product declines to give a score at all.
 */

export const SENIORITY_ORDER = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE"] as const;

// normalize/skillsMatch live in lib/text-utils.ts (no "server-only") so the
// browser-side search engine can use the same implementation. Imported for
// local use and re-exported so existing server-side call sites are unchanged.
import { normalizeToken, skillsMatch } from "@/lib/text-utils";

export { normalizeToken as normalize, skillsMatch };
export { normalizeToken };

export function findMatchingSkill(requirementName: string, profileSkills: Skill[]): Skill | undefined {
  return profileSkills.find((s) => skillsMatch(s.name, requirementName));
}

/**
 * Years of experience, or null when we genuinely do not know.
 *
 * Returning null rather than 0 is the whole point. Three states used to
 * collapse into 0: the user really has no experience, the user has not told
 * us, and the user has experience rows whose dates would not parse. Only
 * the first of those is a fact about the person.
 *
 * A row with no usable dates is skipped rather than counted as a zero-length
 * span, because "this job's dates are missing" is not evidence that the job
 * lasted no time.
 */
export function estimateYearsExperience(profile: FullCareerProfile): number | null {
  if (profile.profile?.yearsExperience != null) return profile.profile.yearsExperience;
  if (profile.experiences.length === 0) return null;

  const intervals: { start: number; end: number }[] = [];
  for (const e of profile.experiences as Experience[]) {
    const start = e.startDate ? new Date(e.startDate).getTime() : NaN;
    const end = e.isCurrent || !e.endDate ? Date.now() : new Date(e.endDate).getTime();

    // Both ends must be real dates in a sane order. An invalid endDate used
    // to produce NaN here, which flowed all the way to a NaN fit score, a
    // "Low" competitiveness badge, and a claim that the user was at
    // PRINCIPAL level, because every numeric comparison against NaN is
    // false and the code fell through to the last branch.
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

    intervals.push({ start, end });
  }

  // Rows existed but none had usable dates: unknown, not zero.
  if (intervals.length === 0) return null;

  // Compute the union of all date intervals to avoid double-counting
  // concurrent roles. A candidate working two jobs from 2020-2021 has
  // 1 year of experience, not 2.
  intervals.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    if (intervals[i].start <= last.end) {
      last.end = Math.max(last.end, intervals[i].end);
    } else {
      merged.push(intervals[i]);
    }
  }

  const totalMs = merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
  return Math.round(totalMs / (1000 * 60 * 60 * 24 * 365));
}

/**
 * The candidate's own level. Returns null when years are unknown and the
 * user has not stated a seniority, instead of guessing.
 *
 * This previously took a plain number and, given NaN, fell through every
 * comparison to return "PRINCIPAL", inventing a senior career for someone
 * whose dates failed to parse.
 */
export function deriveCandidateSeniority(
  candidateYears: number | null,
  careerGoal: CareerGoal | null,
): (typeof SENIORITY_ORDER)[number] | null {
  if (careerGoal?.seniority) return careerGoal.seniority;
  if (candidateYears == null || !Number.isFinite(candidateYears)) return null;
  if (candidateYears < 1) return "ENTRY";
  if (candidateYears < 3) return "JUNIOR";
  if (candidateYears < 6) return "MID";
  if (candidateYears < 10) return "SENIOR";
  if (candidateYears < 15) return "LEAD";
  if (candidateYears < 20) return "PRINCIPAL";
  return "EXECUTIVE";
}

/** Safe index into the seniority ladder. -1 means the value is not one we know. */
export function seniorityIndex(value: string | null | undefined): number {
  if (!value) return -1;
  return (SENIORITY_ORDER as readonly string[]).indexOf(value);
}

/**
 * A component we actually measured.
 *
 * Note what is NOT done here any more: rounding. Seven components were each
 * rounded and then summed, which inflated a total by two to three points
 * against the same components summed at full precision, and that was enough
 * to cross the competitiveness and recommendation thresholds. Precision is
 * kept here and rounded once, at the end, for display.
 */
export function component(score: number, maxScore: number, reasoning: string): ScoreComponent {
  // A non-finite score reaching this point means an upstream calculation
  // divided by something it should have guarded. Fail closed to
  // "unavailable" rather than letting NaN become a number on screen.
  if (!Number.isFinite(score)) {
    return unavailable(maxScore, "This could not be calculated from the available information.");
  }
  return {
    score: Math.max(0, Math.min(score, maxScore)),
    maxScore,
    weight: maxScore,
    reasoning,
    confidence: "measured",
  };
}

/**
 * A component we could not measure.
 *
 * Scores 0 of a maxScore that is then excluded from the denominator, so it
 * costs the user nothing. The reasoning should say what was missing, and
 * should describe what WORKLY does not know rather than asserting something
 * about the user or the posting.
 */
export function unavailable(maxScore: number, reasoning: string): ScoreComponent {
  return { score: 0, maxScore, weight: maxScore, reasoning, confidence: "unavailable" };
}

/**
 * A component scored from a documented default rather than from evidence.
 *
 * Kept for the handful of cases where a default is genuinely defensible
 * (a remote role satisfying any location preference, for instance). Marked
 * `assumed` so the UI can distinguish it, and so it never gets mistaken for
 * a measurement.
 */
export function assumed(score: number, maxScore: number, reasoning: string): ScoreComponent {
  if (!Number.isFinite(score)) return unavailable(maxScore, reasoning);
  return {
    score: Math.max(0, Math.min(score, maxScore)),
    maxScore,
    weight: maxScore,
    reasoning,
    confidence: "assumed",
  };
}

export interface ScoreTotal {
  /** 0-100, computed only over components we could actually assess. Null when too little is known. */
  score: number | null;
  /** What fraction of the total available weight we were able to measure, 0-1. */
  coverage: number;
  /** Names of the components that could not be assessed. */
  missing: string[];
}

// The threshold lives in lib/scoring/coverage.ts, which has no
// `server-only` import, so the display layer can apply exactly the same
// number. A UI that showed a headline figure the engine considered
// unreliable would defeat the point of computing reliability at all.
export { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";

/**
 * Combines components into a total over the weight we could measure.
 *
 * The old version summed every component against a fixed denominator of
 * 100, so an unmeasurable component silently subtracted from the user's
 * score. This divides by the measured weight instead, which is the
 * difference between "you scored 19" and "we could only assess 30% of this,
 * so we are not going to pretend to know".
 */
export function totalFrom(breakdown: Record<string, ScoreComponent>): ScoreTotal {
  let earned = 0;
  let possible = 0;
  let allWeight = 0;
  const missing: string[] = [];

  for (const [name, c] of Object.entries(breakdown)) {
    allWeight += c.maxScore;
    if (c.confidence === "unavailable") {
      missing.push(name);
      continue;
    }
    earned += c.score;
    possible += c.maxScore;
  }

  const coverage = allWeight > 0 ? possible / allWeight : 0;
  let score =
    possible > 0 && coverage >= MIN_COVERAGE_FOR_SCORE
      ? Math.round((earned / possible) * 100)
      : null;

  // IRONCLAD GUARD: Never allow a mathematically inflated score if critical
  // components of the job (like the skills requirement) are completely unknown.
  if (score !== null) {
    if (missing.includes("skills")) {
      score = Math.min(score, 65); // Cap at 65% if skills are unknown
    } else if (coverage < 0.6) {
      score = Math.min(score, 75); // Cap at 75% if we only know half the job
    }
  }

  return { score, coverage, missing };
}
