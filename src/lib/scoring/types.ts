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
  /**
   * How this analysis was produced. "ai-screen" means a model read the
   * posting against the profile requirement by requirement, every claimed
   * match was checked against the candidate's own text, and the number was
   * then computed deterministically from those verdicts. "rules" is the
   * deterministic engine alone. Optional so older rows still type-check.
   */
  method?: "ai-screen" | "rules";
  /** Present only when method is "ai-screen". */
  screen?: ScreenResult;
}

export type RequirementImportance = "critical" | "important" | "nice";
export type RequirementVerdict = "met" | "partial" | "missing" | "unclear";
export type RoleRelevance = "same_role" | "adjacent" | "transferable" | "unrelated";

export interface ScreenedRequirement {
  requirement: string;
  importance: RequirementImportance;
  category: "skill" | "experience" | "education" | "credential" | "other";
  verdict: RequirementVerdict;
  /** Exact text from the candidate's own profile, verified to exist there. Null when none. */
  evidenceQuote: string | null;
  /** Where the evidence came from, in plain words ("Data Analyst at Acme"). */
  evidenceWhere: string | null;
  /** For partial/missing: the most direct way to close it. */
  gapToClose: string | null;
}

export interface ScreenResult {
  summary: string;
  roleRelevance: RoleRelevance;
  relevanceRationale: string;
  requirements: ScreenedRequirement[];
  /** Critical requirements the candidate clearly does not meet. */
  dealbreakers: string[];
  /** Number of AI verdicts downgraded because their quoted evidence was not found on the profile. */
  ungroundedDropped: number;
}

export interface ScoringProvider {
  readonly name: string;
  analyzeFit(input: { profile: FullCareerProfile; careerGoal: CareerGoal | null; job: Job }): JobFitAnalysis;
}
