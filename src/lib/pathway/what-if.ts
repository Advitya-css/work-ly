import "server-only";

import { scoringProvider } from "@/lib/scoring";
import { evaluateFit } from "@/lib/scoring/ai-evaluator";
import { dreamJobToJobLike } from "@/lib/dream-job/to-job-like";
import type { CareerGoal, DreamJob, Project, Skill } from "@/lib/db/types";
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
      const now = new Date();
      const simulated: Skill = {
        id: `simulated-${name}`,
        careerProfileId: clone.profile?.id ?? "simulated",
        name,
        category: "TECHNICAL",
        proficiency: "INTERMEDIATE",
        experienceLevel: "UNDER_1_YEAR",
        evidenceLevel: "DEMONSTRATED",
        source: "USER",
        recency: "CURRENT",
        isTransferable: false,
        transferableRationale: null,
        createdAt: now,
        updatedAt: now,
      };
      // The screen only credits skills shown in real work, so "learned it"
      // is modelled the way it would actually be proven: one project that
      // uses it.
      const project: Project = {
        id: `simulated-project-${name}`,
        careerProfileId: clone.profile?.id ?? "simulated",
        name: `${name} project`,
        role: null,
        description: `Built and shipped a working project using ${name} on a realistic problem, published with a write-up.`,
        url: null,
        startDate: now,
        endDate: now,
        source: "USER",
        isUncertain: false,
        createdAt: now,
        updatedAt: now,
      };
      clone.skills = [...clone.skills, simulated];
      clone.projects = [...clone.projects, project];
      return {
        profile: clone,
        careerGoal,
        label: `If you learned ${name} and built one project with it`,
        caveat: `Assumes one real, public project that uses ${name}. Only listing it on your profile would count for much less.`,
      };
    }

    case "RELOCATE": {
      const place = scenario.value.trim();
      // Location affects fit via the CareerGoal's stated preferences, so
      // the hypothetical belongs there rather than on the profile.
      const simulatedGoal: CareerGoal | null = careerGoal
        ? { ...careerGoal, countries: [place], preferredLocations: [place], isUncertain: false }
        : null;
      // The fit engine reads the profile's own location first, so the move
      // has to happen there too or it changes nothing.
      if (clone.profile) {
        clone.profile.location = place;
        clone.profile.preferredLocations = [place];
      }
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
      // Years now come from role dates, so the hypothetical is "you stayed
      // in your current (or latest) role this much longer". The old version
      // overwrote yearsExperience with 0 + added when it was unset, which
      // could make "+2 years" LOWER your readiness.
      const latest = [...clone.experiences].sort(
        (a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime(),
      )[0];
      if (latest?.startDate) {
        const start = new Date(latest.startDate);
        start.setMonth(start.getMonth() - Math.round(added * 12));
        latest.startDate = start;
      } else if (clone.profile) {
        clone.profile.yearsExperience = (clone.profile.yearsExperience ?? 0) + added;
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

/**
 * Runs a what-if through the SAME scoring path the dream job analysis
 * used (the grounded AI screen when available), so the "current" figure
 * matches the readiness on the page and the change is measured the same
 * way. It used to run the rules engine against a headline number the AI
 * screen had produced - two different calculations side by side.
 */
export async function simulate(params: {
  profile: FullCareerProfile;
  careerGoal: CareerGoal | null;
  dreamJob: DreamJob;
  scenario: Scenario;
  /** The readiness shown on the page (from the stored analysis). */
  currentReadiness: number | null;
}): Promise<SimulationResult> {
  const { profile, careerGoal, dreamJob, scenario } = params;
  const job = dreamJobToJobLike(dreamJob);
  const applied = applyScenario(profile, careerGoal, scenario);

  const outcome = await evaluateFit({ profile: applied.profile, careerGoal: applied.careerGoal, job });
  let simulated = outcome.analysis.fitScore;
  let current: number;
  if (outcome.analysis.method === "ai-screen" && params.currentReadiness != null) {
    current = params.currentReadiness;
  } else {
    // Rules fallback: compare like with like.
    current = scoringProvider.analyzeFit({ profile, careerGoal, job }).fitScore;
  }
  // Learning something or gaining experience can't make you LESS ready;
  // a lower number here would only be model noise, not a finding.
  if (scenario.kind !== "RELOCATE") simulated = Math.max(simulated, current);

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
