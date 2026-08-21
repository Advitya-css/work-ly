import "server-only";

import { scoringProvider } from "@/lib/scoring";
import { dreamJobToJobLike } from "@/lib/dream-job/to-job-like";
import type { CareerGoal, DreamJob, Skill } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { Scenario, SimulationResult } from "@/lib/pathway/what-if-types";

// The scenario vocabulary and result shape live in what-if-types.ts (no
// server-only import) so client components can use them; re-exported here
// so server-side callers have a single import site.
export type { Scenario, ScenarioKind, SimulationResult } from "@/lib/pathway/what-if-types";
export { SCENARIO_KINDS } from "@/lib/pathway/what-if-types";

/**
 * WHAT-IF SIMULATION LAYER
 *
 * Architecture note (Phase 6 spec: "architect but don't overbuild"):
 *
 * A simulation answers "if my profile were different in exactly ONE way,
 * what would my readiness be?" It works by cloning the user's profile,
 * applying a single hypothetical change, and re-running the SAME
 * scoringProvider.analyzeFit used everywhere else. That's the whole
 * design - no separate predictive model, no second scoring implementation
 * that could drift from the real one.
 *
 * Three scenario kinds are implemented, matching the spec's examples.
 * Adding a fourth means adding one case to `applyScenario` and one entry
 * to `SCENARIO_KINDS`; nothing else changes.
 *
 * HONESTY CONSTRAINTS, deliberately enforced here rather than in the UI:
 *
 *  - A simulated profile is never persisted. It exists for one function
 *    call. There is no code path by which a hypothetical skill can end up
 *    on the real profile.
 *  - Results carry `isSimulation: true` and a `caveat` string, and the UI
 *    must render both. A simulated readiness is not evidence of anything -
 *    it's arithmetic on a hypothetical.
 *  - A simulated skill is inserted at evidenceLevel STATED, never
 *    DEMONSTRATED, because "I learned Python" without a project genuinely
 *    is the weaker claim, and pretending otherwise would overstate the gain.
 */

/** Returns a deep-enough copy that mutating it can't touch the caller's profile. */
function cloneProfile(profile: FullCareerProfile): FullCareerProfile {
  return {
    ...profile,
    profile: profile.profile ? { ...profile.profile } : null,
    skills: profile.skills.map((s) => ({ ...s })),
    experiences: profile.experiences.map((e) => ({ ...e })),
    educations: [...profile.educations],
    projects: [...profile.projects],
    achievements: [...profile.achievements],
    certifications: [...profile.certifications],
    documents: [...profile.documents],
  };
}

function applyScenario(
  profile: FullCareerProfile,
  careerGoal: CareerGoal | null,
  scenario: Scenario,
): { profile: FullCareerProfile; careerGoal: CareerGoal | null; label: string; caveat: string } {
  const clone = cloneProfile(profile);

  switch (scenario.kind) {
    case "LEARN_SKILL": {
      const name = scenario.value.trim();
      const simulated: Skill = {
        id: `simulated-${name}`,
        careerProfileId: clone.profile?.id ?? "simulated",
        name,
        category: "TECHNICAL",
        proficiency: "INTERMEDIATE",
        experienceLevel: "UNDER_1_YEAR",
        // STATED, not DEMONSTRATED - see the honesty note at the top.
        evidenceLevel: "STATED",
        source: "USER",
        recency: "CURRENT",
        isTransferable: false,
        transferableRationale: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      clone.skills = [...clone.skills, simulated];
      return {
        profile: clone,
        careerGoal,
        label: `If you learned ${name}`,
        caveat: `Assumes ${name} on your profile as a stated skill. Backing it with a real project or certification would score higher still. This is the conservative version.`,
      };
    }

    case "RELOCATE": {
      const place = scenario.value.trim();
      // Location affects fit via the CareerGoal's stated preferences, so
      // the hypothetical belongs there rather than on the profile.
      const simulatedGoal: CareerGoal | null = careerGoal
        ? { ...careerGoal, countries: [place], preferredLocations: [place], isUncertain: false }
        : null;
      return {
        profile: clone,
        careerGoal: simulatedGoal,
        label: `If you moved to ${place}`,
        caveat: careerGoal
          ? `Only models location eligibility against this role. It does not account for visas, right-to-work, or relocation cost. All of which usually matter more than fit.`
          : `You haven't set career goals yet, so there are no location preferences to vary. Set them first for this simulation to mean anything.`,
      };
    }

    case "GAIN_EXPERIENCE": {
      const years = Number.parseFloat(scenario.value);
      const added = Number.isFinite(years) && years > 0 ? years : 1;
      const base = clone.profile;
      if (base) {
        const current = base.yearsExperience ?? 0;
        base.yearsExperience = Math.round(current + added);
      }
      return {
        profile: clone,
        careerGoal,
        label: `If you had ${added} more year${added === 1 ? "" : "s"} of experience`,
        caveat: `Models years only. Real seniority comes from scope and impact, not elapsed time. Two people with the same tenure can be very differently placed.`,
      };
    }
  }
}

export function simulate(params: {
  profile: FullCareerProfile;
  careerGoal: CareerGoal | null;
  dreamJob: DreamJob;
  scenario: Scenario;
}): SimulationResult {
  const { profile, careerGoal, dreamJob, scenario } = params;
  const job = dreamJobToJobLike(dreamJob);

  const current = scoringProvider.analyzeFit({ profile, careerGoal, job }).fitScore;

  const applied = applyScenario(profile, careerGoal, scenario);
  const simulated = scoringProvider.analyzeFit({
    profile: applied.profile,
    careerGoal: applied.careerGoal,
    job,
  }).fitScore;

  return {
    isSimulation: true,
    scenario,
    label: applied.label,
    currentReadiness: current,
    simulatedReadiness: simulated,
    delta: simulated - current,
    caveat: applied.caveat,
  };
}
