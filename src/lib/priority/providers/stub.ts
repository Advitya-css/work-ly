import type { CareerGoal, Job, JobAnalysis, PriorityBreakdown } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { PriorityProvider, PriorityResult } from "@/lib/priority/types";
import {
  SENIORITY_ORDER,
  assumed,
  component,
  deriveCandidateSeniority,
  estimateYearsExperience,
  normalize,
  seniorityIndex,
  totalFrom,
  unavailable,
} from "@/lib/scoring/shared";
import { isReliable } from "@/lib/scoring/coverage";

// ---------------------------------------------------------------------------
// Weights - Phase 4 spec's component list. Sum to 100. Deliberately NOT the
// same weighting (or even the same inputs) as Fit's WEIGHTS in
// lib/scoring/providers/stub.ts - Priority is its own question.
// ---------------------------------------------------------------------------
const WEIGHTS = {
  candidateFit: 25,
  careerValue: 15,
  competitiveness: 15,
  applicationEffort: 10,
  salary: 10,
  location: 10,
  careerProgression: 10,
  userPreferences: 5,
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** The one component that directly reads Fit - capped at 25% of Priority so a high-fit role can't dominate the score on its own. */
function scoreCandidateFit(analysis: JobAnalysis) {
  // A stored analysis is hydrated from a raw SQL row, so a corrupt or
  // legacy value can arrive non-finite. Previously that produced NaN
  // priority points and a confident ranking built on nothing.
  if (!Number.isFinite(analysis.fitScore)) {
    return unavailable(WEIGHTS.candidateFit, "Work-ly does not have a usable Candidate Fit for this role.");
  }

  // If Fit itself declined to give a number, Priority must not launder that
  // into points. Converting an unreliable 0 into "0 of 25" restates a
  // non-answer as a measurement, and does it a second time in a place the
  // user reads as independent confirmation.
  if (!isReliable(analysis.scoreBreakdown)) {
    return unavailable(
      WEIGHTS.candidateFit,
      "Work-ly could not assess enough of this role against your profile to produce a Candidate Fit, so it is not scoring one here either.",
    );
  }

  const ratio = analysis.fitScore / 100;
  return component(
    ratio * WEIGHTS.candidateFit,
    WEIGHTS.candidateFit,
    `Candidate Fit for this role is ${analysis.fitScore}/100.`,
  );
}

/** Does taking this role actually serve where the user says they're headed - not "could I get it", but "should I want it". */
function scoreCareerValue(job: Job, careerGoal: CareerGoal | null) {
  const hasTargeting =
    careerGoal && !careerGoal.isUncertain && (careerGoal.primaryTargetRole || careerGoal.industries.length > 0);
  if (!hasTargeting) {
    return unavailable(
      WEIGHTS.careerValue,
      "You have not set a target role or industry yet, so Work-ly cannot judge whether this role moves you toward it.",
    );
  }

  const goal = careerGoal!;
  const jobTitle = job.title ? normalize(job.title) : "";
  const titleMatch = Boolean(
    jobTitle && goal.primaryTargetRole && jobTitle.includes(normalize(goal.primaryTargetRole)),
  );
  const secondaryMatch =
    !titleMatch &&
    jobTitle &&
    goal.secondaryTargetRoles.some((role) => jobTitle.includes(normalize(role)) || normalize(role).includes(jobTitle));
  const industryMatch = Boolean(
    job.industry && goal.industries.some((i) => normalize(i) === normalize(job.industry!)),
  );

  if (titleMatch) {
    return component(
      WEIGHTS.careerValue,
      WEIGHTS.careerValue,
      `This role's title lines up directly with your target role (${goal.primaryTargetRole}).`,
    );
  }
  if (secondaryMatch) {
    return component(
      0.8 * WEIGHTS.careerValue,
      WEIGHTS.careerValue,
      "This role matches one of your secondary target roles.",
    );
  }
  if (industryMatch) {
    return component(
      0.6 * WEIGHTS.careerValue,
      WEIGHTS.careerValue,
      `This role is in ${job.industry}, one of your target industries, even though the title differs from what you're aiming for.`,
    );
  }
  return component(
    0.25 * WEIGHTS.careerValue,
    WEIGHTS.careerValue,
    "This role doesn't clearly match the role or industry you told Work-ly you're targeting.",
  );
}

/**
 * Distinct from the Candidate Fit component above: this reads the literal
 * mandatory-requirements checklist (met/unmet counts) rather than the
 * blended Fit score, so it stays a meaningfully separate signal instead of
 * just echoing candidateFit a second time.
 */
function scoreCompetitiveness(analysis: JobAnalysis) {
  // Only requirements we could actually verify count on either side. An
  // unverifiable requirement used to be filed as a failure, which turned a
  // limitation of the text matcher into evidence against the candidate.
  const checkable = analysis.mandatoryRequirements.filter((r) => r.status !== "unknown");
  if (checkable.length === 0) {
    return unavailable(
      WEIGHTS.competitiveness,
      "Work-ly could not verify any of this posting's mandatory requirements automatically, so it cannot judge how contested the role is.",
    );
  }
  const met = checkable.filter((r) => r.status === "met").length;
  const ratio = met / checkable.length;
  return component(
    ratio * WEIGHTS.competitiveness,
    WEIGHTS.competitiveness,
    `You clearly meet ${met} of the ${checkable.length} mandatory requirement${checkable.length === 1 ? "" : "s"} Work-ly could check.`,
  );
}

/** How much extra work this application is likely to take, inferred from the gap types and unmet mandatory items an analysis already surfaced - never a fabricated effort estimate. */
function scoreApplicationEffort(analysis: JobAnalysis) {
  const highEffortGaps = analysis.gaps.filter((g) => g.type === "PORTFOLIO_GAP" || g.type === "CREDENTIAL_GAP").length;
  const unmet = analysis.mandatoryRequirements.filter((r) => r.status === "not-met").length;
  const penalty = highEffortGaps * 0.35 + Math.max(0, unmet - 1) * 0.12;
  const ratio = clamp(1 - penalty, 0.15, 1);

  let reasoning: string;
  if (highEffortGaps > 0) {
    reasoning = `Closing this role's gaps likely needs real prep (portfolio or credential work), not just a tailored resume.`;
  } else if (unmet > 1) {
    reasoning = `${unmet} mandatory requirements aren't clearly met. Expect to spend time addressing those in your application.`;
  } else {
    reasoning = "Nothing here suggests unusual extra prep beyond a normal tailored application.";
  }
  return component(ratio * WEIGHTS.applicationEffort, WEIGHTS.applicationEffort, reasoning);
}

/** Compares the posting's salary against the user's stated floor - never against Fit, never against effort. */
function scoreSalary(job: Job, careerGoal: CareerGoal | null) {
  if (job.salaryMin == null && job.salaryMax == null) {
    return unavailable(
      WEIGHTS.salary,
      "This posting does not list a salary, so there is nothing to compare against your target.",
    );
  }
  if (!careerGoal || careerGoal.isUncertain || (careerGoal.salaryMin == null && careerGoal.salaryMax == null)) {
    return unavailable(
      WEIGHTS.salary,
      "You have not set a target salary yet, so this cannot be compared.",
    );
  }
  // Both currencies must be known before any numeric comparison. The old
  // guard only fired when BOTH were present, so a posting with no stated
  // currency was compared digit-for-digit against the user's target and
  // could score a confident 10/10 across incomparable units.
  if (!job.salaryCurrency || !careerGoal.salaryCurrency) {
    return unavailable(
      WEIGHTS.salary,
      "Work-ly does not know the currency on both sides here, so comparing the figures would be meaningless.",
    );
  }
  if (job.salaryCurrency.toUpperCase() !== careerGoal.salaryCurrency.toUpperCase()) {
    return unavailable(
      WEIGHTS.salary,
      `This role pays in ${job.salaryCurrency} and your target is in ${careerGoal.salaryCurrency}. Work-ly does not convert currencies, so it will not guess.`,
    );
  }

  const jobHigh = job.salaryMax ?? job.salaryMin!;
  // Explicitly nullable rather than `?? 0`, which conflated "no floor set"
  // with "a floor of zero".
  const goalFloor = careerGoal.salaryMin ?? careerGoal.salaryMax;
  if (goalFloor == null || goalFloor <= 0) {
    return unavailable(WEIGHTS.salary, "You listed a target range with no clear floor to compare against.");
  }
  if (jobHigh >= goalFloor) {
    return component(WEIGHTS.salary, WEIGHTS.salary, "This role's salary meets or exceeds your stated target minimum.");
  }
  const ratio = clamp(jobHigh / goalFloor, 0.2, 0.85);
  return component(
    ratio * WEIGHTS.salary,
    WEIGHTS.salary,
    "This role's listed salary falls short of your stated target minimum.",
  );
}

/** Geography + work mode against the user's stated preferences - independent of Fit's own (much smaller) location component. */
function scoreLocation(job: Job, profile: FullCareerProfile, careerGoal: CareerGoal | null) {
  if (job.workMode === "REMOTE") {
    return assumed(WEIGHTS.location, WEIGHTS.location, "This role is remote, so location is not a constraint.");
  }

  const preferredLocations = profile.profile?.preferredLocations?.length
    ? profile.profile.preferredLocations
    : (careerGoal?.preferredLocations ?? []);
  const home = profile.profile?.location ?? null;
  const countries = careerGoal?.countries ?? [];
  const workModes = careerGoal?.workModes ?? [];

  const anyPreference = Boolean(home) || preferredLocations.length > 0 || countries.length > 0 || workModes.length > 0;
  
  if (!anyPreference) {
    return unavailable(
      WEIGHTS.location,
      "You have not told Work-ly where you want to work, so it cannot judge this role's location.",
    );
  }

  const checks: boolean[] = [];
  if (job.workMode && workModes.length > 0) checks.push(workModes.includes(job.workMode));
  
  if (job.location && (preferredLocations.length > 0 || home)) {
    const candidates = [home, ...preferredLocations].filter(Boolean) as string[];
    const loc = job.location.toLowerCase();
    checks.push(candidates.some((l) => loc.includes(l.toLowerCase()) || l.toLowerCase().includes(loc)));
  }
  
  if (job.country && countries.length > 0) {
    const c = job.country.toLowerCase();
    checks.push(countries.some((x) => c.includes(x.toLowerCase()) || x.toLowerCase().includes(c)));
  }

  if (checks.length === 0) {
    return unavailable(
      WEIGHTS.location,
      "This posting does not say where the role is based, so Work-ly cannot check it against your preferences.",
    );
  }

  const allOk = checks.every(Boolean);
  return component(
    (allOk ? 1 : 0.3) * WEIGHTS.location,
    WEIGHTS.location,
    allOk
      ? "Where this role is based matches what you said you wanted."
      : "Where this role is based does not match what you said you wanted.",
  );
}

/** Rewards a genuine step up in seniority more than a same-level lateral move, and penalizes both regressions and unrealistic multi-level jumps. */
function scoreCareerProgression(job: Job, profile: FullCareerProfile, careerGoal: CareerGoal | null) {
  if (!job.seniority) {
    return unavailable(
      WEIGHTS.careerProgression,
      "Work-ly could not identify a seniority level in this posting, so it cannot judge progression.",
    );
  }
  const candidateYears = estimateYearsExperience(profile);
  const candidateLevel = deriveCandidateSeniority(candidateYears, careerGoal);
  if (!candidateLevel) {
    return unavailable(
      WEIGHTS.careerProgression,
      "Work-ly does not know your current level yet, so it cannot say whether this is a step up.",
    );
  }
  const candidateIdx = seniorityIndex(candidateLevel);
  const jobIdx = seniorityIndex(job.seniority);
  // An unrecognised level gave indexOf === -1, which made diff negative and
  // produced a confident "this role is a step down from your current level"
  // about a comparison that never happened.
  if (candidateIdx < 0 || jobIdx < 0) {
    return unavailable(WEIGHTS.careerProgression, "Work-ly could not place one of these on its seniority scale.");
  }
  const diff = jobIdx - candidateIdx;

  if (diff === 1) {
    return component(WEIGHTS.careerProgression, WEIGHTS.careerProgression, "This role is a genuine step up from your current level.");
  }
  if (diff === 0) {
    return component(0.7 * WEIGHTS.careerProgression, WEIGHTS.careerProgression, "This role is a lateral move at your current level.");
  }
  if (diff === 2) {
    return component(0.5 * WEIGHTS.careerProgression, WEIGHTS.careerProgression, "This role is an ambitious stretch upward. More than one level up.");
  }
  if (diff === -1) {
    return component(0.4 * WEIGHTS.careerProgression, WEIGHTS.careerProgression, "This role is one level below your current one. It may be a strategic pivot or a step back.");
  }
  if (diff < -1) {
    return component(0.2 * WEIGHTS.careerProgression, WEIGHTS.careerProgression, "This role is well below your current level. It may represent a significant career regression.");
  }
  // diff >= 3: unrealistic multi-level jump
  return component(0.15 * WEIGHTS.careerProgression, WEIGHTS.careerProgression, "This role is several levels above your current one. A jump this large is rarely achievable directly.");
}

/** Employment type against stated preferences - the smallest-weighted component, catching what location/salary/career-value don't. */
function scoreUserPreferences(job: Job, careerGoal: CareerGoal | null) {
  if (!careerGoal || careerGoal.isUncertain) {
    return unavailable(WEIGHTS.userPreferences, "You have not set firm preferences in your career goals yet.");
  }
  if (careerGoal.employmentTypes.length === 0) {
    return unavailable(WEIGHTS.userPreferences, "You have not stated an employment-type preference.");
  }
  // A posting that never stated its employment type was being reported as
  // conflicting with the user's preference, which is a claim about a
  // comparison that could not be made.
  if (!job.employmentType) {
    return unavailable(WEIGHTS.userPreferences, "This posting does not state an employment type.");
  }
  const match = careerGoal.employmentTypes.includes(job.employmentType);
  return component(
    (match ? 1 : 0.25) * WEIGHTS.userPreferences,
    WEIGHTS.userPreferences,
    match
      ? "This role's employment type matches what you're looking for."
      : "This role's employment type doesn't match your stated preference.",
  );
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function computePriority({
  profile,
  careerGoal,
  job,
  analysis,
}: {
  profile: FullCareerProfile;
  careerGoal: CareerGoal | null;
  job: Job;
  analysis: JobAnalysis;
}): PriorityResult {
  const candidateFit = scoreCandidateFit(analysis);
  const careerValue = scoreCareerValue(job, careerGoal);
  const competitiveness = scoreCompetitiveness(analysis);
  const applicationEffort = scoreApplicationEffort(analysis);
  const salary = scoreSalary(job, careerGoal);
  const location = scoreLocation(job, profile, careerGoal);
  const careerProgression = scoreCareerProgression(job, profile, careerGoal);
  const userPreferences = scoreUserPreferences(job, careerGoal);

  const priorityBreakdown: PriorityBreakdown = {
    candidateFit,
    careerValue,
    competitiveness,
    applicationEffort,
    salary,
    location,
    careerProgression,
    userPreferences,
  };

  // Same rule as Fit: divide by the weight we could actually measure, not
  // by a fixed 100. Summing every component against a fixed denominator
  // meant an unmeasurable component silently subtracted from the user's
  // priority, so a role looked less worth their time purely because they
  // had not filled in a salary target.
  const total = totalFrom(priorityBreakdown as unknown as Record<string, (typeof priorityBreakdown)["salary"]>);

  return {
    priorityScore: clamp(total.score ?? 0, 0, 100),
    coverage: total.coverage,
    unassessed: total.missing,
    priorityBreakdown,
  };
}

export const deterministicPriorityProvider: PriorityProvider = {
  name: "deterministic",
  computePriority,
};
