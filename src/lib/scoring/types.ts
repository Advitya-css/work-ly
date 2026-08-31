/**
 * Scoring abstraction - kept separate from the AI provider on purpose.
 * Scoring turns structured facts on both sides (a CareerProfile, a Job)
 * into "Candidate Fit": how well *stated* profile facts match a role's
 * *stated* requirements. Deliberately NOT a hire-probability estimate -
 * Phase 3 has no validated outcome data (real application results) to
 * calibrate one, so nothing here is presented as "chance of getting
 * hired" (see ApplicationOutcome in the future-models list in
 * prisma/schema.prisma - that's what a real likelihood would need).
 *
 * Implemented as a deterministic, rule-based engine (providers/stub.ts) -
 * every number is re-derivable from the two records being compared, so
 * results are consistent and explainable without depending on a live AI
 * call. Kept behind this same provider-style interface as the other
 * abstractions (auth/storage/AI) in case a future phase adds a
 * statistically-calibrated alternative once real outcome data exists.
 */
import type { CareerGoal, GapItem, Job, RecommendationType, RequirementCheck, ScoreBreakdown } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export interface JobFitAnalysis {
  /**
   * 0-100, computed ONLY over the components Work-ly could actually assess.
   * Read it as "of what could be compared, how much do you meet", not as
   * "you scored X out of everything possible".
   *
   * ALWAYS check `coverage` before presenting this. Below the reliability
   * threshold, `competitiveness` becomes "Insufficient data" and this
   * number must not be shown as a headline figure, because a precise
   * number derived from a fraction of the criteria is exactly the kind
   * that persuades wrongly.
   */
  fitScore: number;
  /** 0-1: how much of the total weighting was actually measurable. */
  coverage: number;
  /** Names of the components that could not be assessed at all. */
  unassessed: string[];
  competitiveness: "Low" | "Moderate" | "High" | "Insufficient data";
  scoreBreakdown: ScoreBreakdown;
  recommendation: RecommendationType;
  recommendationReasoning: string;
  strengths: string[];
  weaknesses: string[];
  gaps: GapItem[];
  mandatoryRequirements: RequirementCheck[];
  preferredRequirements: RequirementCheck[];
  risks: string[];
  improvements: string[];
}

export interface ScoringProvider {
  readonly name: string;
  analyzeFit(input: { profile: FullCareerProfile; careerGoal: CareerGoal | null; job: Job }): JobFitAnalysis;
}
