import "server-only";

import type {
  CareerGoal,
  DreamJobAnalysis,
  GapPriority,
  OpportunityWithJob,
} from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { NewPathway, NewPathwayStep } from "@/lib/db/career-pathways";
import { estimateYearsExperience, normalize, skillsMatch } from "@/lib/scoring/shared";
import { buildNinetyDayPlan } from "@/lib/pathway/plan-90-days";

/**
 * Turns a Phase 5 gap analysis into an ordered, trackable route.
 *
 * Design rule carried through the whole engine: a step only ever claims
 * "could make you relevant to N more opportunities" when N was counted
 * from the user's own Opportunity rows. There is no estimated, modelled or
 * assumed figure anywhere in this file - if we can't count it, we don't
 * say it.
 */

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/**
 * Sequencing is NOT the same as the gap ranking from Phase 5. Phase 5
 * ranks by impact - "what matters most". A pathway has to be walkable, so
 * it front-loads work that is quick and unblocks other work (positioning,
 * evidence) before long-running work (credentials, seniority), even when
 * the long-running item scores higher on raw impact. Doing it the other
 * way round produces a technically-correct list that nobody can start.
 */
const SEQUENCE_RANK: Record<string, number> = {
  POSITIONING_GAP: 0, // rewriting how you present yourself: days, unblocks everything
  EVIDENCE_GAP: 1, // documenting work you have already done
  PORTFOLIO_GAP: 2, // building something new to show
  SKILL_GAP: 3, // learning something new
  CREDENTIAL_GAP: 4, // courses/certifications: weeks to months
  EXPERIENCE_GAP: 5, // time served; can only be partially offset
  SENIORITY_GAP: 6, // follows from all of the above
};

const DIFFICULTY_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function sequenceGaps(gaps: GapPriority[]): GapPriority[] {
  return [...gaps].sort((a, b) => {
    const rankA = SEQUENCE_RANK[a.gapType] ?? 9;
    const rankB = SEQUENCE_RANK[b.gapType] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    // Within a category: cheaper first, then whatever helps more jobs.
    const diffA = DIFFICULTY_RANK[a.difficulty] ?? 1;
    const diffB = DIFFICULTY_RANK[b.difficulty] ?? 1;
    if (diffA !== diffB) return diffA - diffB;
    return b.affectedOpportunityCount - a.affectedOpportunityCount;
  });
}

// ---------------------------------------------------------------------------
// Step titles - imperative and concrete, never a restated gap name
// ---------------------------------------------------------------------------

function stripRequirementPrefix(text: string): string {
  return (
    text
      .replace(/^(strong |proven |demonstrated |advanced |solid )?(experience (with|in|building|using)|proficiency in|knowledge of|familiarity with)\s+/i, "")
      .trim() || text
  );
}

function stepTitleFor(gap: GapPriority): string {
  const subject = stripRequirementPrefix(gap.title);
  switch (gap.gapType) {
    case "SKILL_GAP":
      return `Develop ${subject}`;
    case "PORTFOLIO_GAP":
      return "Build industry portfolio";
    case "EVIDENCE_GAP":
      return "Strengthen evidence for your existing skills";
    case "CREDENTIAL_GAP":
      return "Close the credential gap";
    case "EXPERIENCE_GAP":
      return "Gain relevant hands-on experience";
    case "SENIORITY_GAP":
      return "Build scope toward the next level";
    case "POSITIONING_GAP":
      return "Reposition your profile for this field";
    default:
      return subject;
  }
}

// ---------------------------------------------------------------------------
// Opportunity grounding
// ---------------------------------------------------------------------------

/**
 * Counts how many of the user's tracked opportunities ask for something
 * this step delivers AND that they don't currently satisfy. Deliberately
 * narrower than "jobs mentioning this skill": an opportunity the user is
 * already a strong match for isn't "unlocked" by anything, so counting it
 * would inflate the number the UI puts in front of them.
 */
function countUnlockedOpportunities(
  gap: GapPriority,
  opportunities: OpportunityWithJob[],
  profile: FullCareerProfile,
): { count: number; ids: string[] } {
  const confirmed = profile.skills.filter((s) => !s.isTransferable);

  const relevant = opportunities.filter((opportunity) => {
    // Already a strong match - nothing to unlock here.
    if (opportunity.fitScore >= 80) return false;

    if (gap.gapType === "SKILL_GAP") {
      const wantsIt = [...opportunity.job.requiredSkills, ...opportunity.job.preferredSkills].some((s) =>
        skillsMatch(gap.title, s),
      );
      if (!wantsIt) return false;
      // If they already have the skill, this step doesn't change anything.
      return !confirmed.some((s) => skillsMatch(s.name, gap.title));
    }

    // Non-skill gaps: the opportunity's own analysis flagged the same gap
    // category, so closing it genuinely moves this application forward.
    return Boolean(opportunity.analysis?.gaps.some((g) => g.type === gap.gapType));
  });

  return { count: relevant.length, ids: relevant.map((o) => o.id) };
}

// ---------------------------------------------------------------------------
// Current / target state labels
// ---------------------------------------------------------------------------

function currentStateLabel(profile: FullCareerProfile): string {
  const current = profile.experiences.find((e) => e.isCurrent) ?? profile.experiences[0];
  return (
    profile.profile?.currentRole?.trim() ||
    current?.title?.trim() ||
    profile.profile?.headline?.trim() ||
    "Your current role"
  );
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface BuildPathwayInput {
  profile: FullCareerProfile;
  careerGoal: CareerGoal | null;
  opportunities: OpportunityWithJob[];
  /// The analyzed dream job this pathway targets, when there is one.
  dreamJob: { id: string; title: string | null; dreamRole: string } | null;
  analysis: DreamJobAnalysis | null;
}

export function buildPathway(input: BuildPathwayInput): NewPathway {
  const { profile, careerGoal, opportunities, dreamJob, analysis } = input;

  const target =
    dreamJob?.title?.trim() ||
    dreamJob?.dreamRole?.trim() ||
    careerGoal?.primaryTargetRole?.trim() ||
    careerGoal?.targetRole?.trim() ||
    careerGoal?.title?.trim() ||
    "Your target role";

  // ---- Steps -------------------------------------------------------------
  const gaps = analysis ? sequenceGaps(analysis.gapPriorities) : [];

  // Project recommendations are matched back to the gap they were generated
  // to close, so a step carries its own project rather than the page having
  // to show a disconnected list.
  const projectFor = (gap: GapPriority) =>
    analysis?.projectRecommendations.find(
      (p) => normalize(p.why).includes(normalize(gap.title)) || normalize(p.project).includes(normalize(stripRequirementPrefix(gap.title))),
    ) ?? null;

  const steps: NewPathwayStep[] = gaps.slice(0, 8).map((gap, index) => {
    const unlocked = countUnlockedOpportunities(gap, opportunities, profile);
    return {
      order: index + 1,
      title: stepTitleFor(gap),
      description: gap.description,
      gapType: gap.gapType,
      relatedSkill: gap.gapType === "SKILL_GAP" ? gap.title : null,
      unlockedOpportunityCount: unlocked.count,
      unlockedOpportunityIds: unlocked.ids,
      projectRecommendation: projectFor(gap),
    };
  });

  // A pathway with no gaps at all still needs to say something useful.
  if (steps.length === 0) {
    steps.push({
      order: 1,
      title: "Apply to roles at this level",
      description:
        analysis && analysis.readinessScore >= 70
          ? "No significant gaps were found between your profile and this target. The main lever left is applying, with a tailored application per role."
          : "Add more detail to your career profile (or analyze a target job) so Work-ly can identify concrete gaps to work on.",
      gapType: null,
      relatedSkill: null,
      unlockedOpportunityCount: 0,
      unlockedOpportunityIds: [],
      projectRecommendation: null,
    });
  }

  // Final step is always the target itself becoming actionable.
  steps.push({
    order: steps.length + 1,
    title: `Apply to ${target} roles`,
    description: `With the steps above closed, you're positioned to apply to ${target} roles directly rather than as a stretch.`,
    gapType: null,
    relatedSkill: null,
    unlockedOpportunityCount: 0,
    unlockedOpportunityIds: [],
    projectRecommendation: null,
  });

  // ---- 30/60/90 actions --------------------------------------------------
  const actions = buildNinetyDayPlan({ steps, gaps, opportunities, profile, analysis });

  return {
    dreamJobId: dreamJob?.id ?? null,
    currentStateLabel: currentStateLabel(profile),
    targetStateLabel: target,
    startingReadiness: analysis?.readinessScore ?? 0,
    steps,
    actions,
  };
}

/**
 * Exported for the what-if layer, which needs the same "years so far"
 * figure. Nullable, because "we do not know how long you have worked" is a
 * real answer and used to be reported as the number 0.
 */
export function candidateYears(profile: FullCareerProfile): number | null {
  return estimateYearsExperience(profile);
}
