/**
 * Priority scoring - kept deliberately separate from Fit scoring
 * (lib/scoring). Fit answers "how well do I match this role's stated
 * requirements" - Priority answers a different question: "what should I
 * spend my time on right now." A role can be a near-perfect Fit and still
 * be low Priority (pays below your floor, wrong city, no real step up);
 * a role can be a middling Fit and still be high Priority (great career
 * value, low effort to apply, easy geographic/salary match). The two
 * scores are never derived from each other.
 *
 * Same deterministic, rule-based design as lib/scoring: every number
 * traces back to a computed fact (the JobAnalysis just produced, the
 * user's own CareerGoal, their own Experience entries) - nothing here is
 * an unconstrained model guess.
 */
import type { CareerGoal, Job, JobAnalysis, PriorityBreakdown } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export interface PriorityResult {
  /**
   * 0-100 over the components that could actually be assessed. Check
   * `coverage` before presenting it as a number: below the reliability
   * threshold this is a percentage of very little.
   */
  priorityScore: number;
  /** 0-1: how much of the total weighting was measurable. */
  coverage: number;
  /** Component names that could not be assessed at all. */
  unassessed: string[];
  priorityBreakdown: PriorityBreakdown;
}

export interface PriorityProvider {
  readonly name: string;
  computePriority(input: {
    profile: FullCareerProfile;
    careerGoal: CareerGoal | null;
    job: Job;
    analysis: JobAnalysis;
  }): PriorityResult;
}
