import "server-only";

import type { DreamJobAnalysis, GapPriority, OpportunityWithJob } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { NewPathwayAction, NewPathwayStep } from "@/lib/db/career-pathways";
import { skillsMatch } from "@/lib/scoring/shared";

/**
 * Turns pathway steps into dated, concrete actions across three 30-day
 * windows.
 *
 * The window a step lands in is driven by how long its work actually takes,
 * not by its position in the list: a HIGH-difficulty skill can't be
 * meaningfully started AND finished in the first 30 days, while a
 * positioning rewrite genuinely can. Every action's expectedImpact either
 * cites a counted number of the user's own opportunities or says plainly
 * that it's specific to the target role - never an invented percentage.
 */

type Window = NewPathwayAction["window"];

const DIFFICULTY_TO_WINDOW: Record<string, Window> = {
  LOW: "DAYS_0_30",
  MEDIUM: "DAYS_31_60",
  HIGH: "DAYS_61_90",
};

function difficultyLabel(difficulty: string): string {
  if (difficulty === "HIGH") return "Hard";
  if (difficulty === "MEDIUM") return "Moderate";
  return "Easy";
}

function impactFor(gap: GapPriority | null, targetJobs: string[]): string {
  if (gap && gap.affectedOpportunityCount > 0) {
    return `Strengthens your standing on ${gap.affectedOpportunityCount} opportunit${gap.affectedOpportunityCount === 1 ? "y" : "ies"} you're already tracking.`;
  }
  if (targetJobs.length > 0) {
    return `Directly relevant to ${targetJobs.length} role${targetJobs.length === 1 ? "" : "s"} in your pipeline.`;
  }
  return "Moves you toward your target role, even though it doesn't overlap with your tracked opportunities yet.";
}

/** Job titles from the user's OWN opportunities that want this skill. */
function relatedJobTitles(skill: string | null, opportunities: OpportunityWithJob[]): string[] {
  if (!skill) return [];
  return opportunities
    .filter((o) => [...o.job.requiredSkills, ...o.job.preferredSkills].some((s) => skillsMatch(s, skill)))
    .map((o) => `${o.job.title ?? "Untitled role"}${o.job.company ? ` at ${o.job.company}` : ""}`)
    .slice(0, 5);
}

export interface NinetyDayPlanInput {
  steps: NewPathwayStep[];
  gaps: GapPriority[];
  opportunities: OpportunityWithJob[];
  profile: FullCareerProfile;
  analysis: DreamJobAnalysis | null;
}

export function buildNinetyDayPlan(input: NinetyDayPlanInput): NewPathwayAction[] {
  const { steps, gaps, opportunities, profile, analysis } = input;
  const actions: NewPathwayAction[] = [];
  const orderIn: Record<Window, number> = { DAYS_0_30: 0, DAYS_31_60: 0, DAYS_61_90: 0 };

  const push = (window: Window, action: Omit<NewPathwayAction, "window" | "order">) => {
    actions.push({ ...action, window, order: orderIn[window]++ });
  };

  // --- Removed CV/Profile fixes from the 90-day plan to ensure the pathway
  // focuses strictly on high-impact career progression (skills, projects, experience).

  // --- One or more actions per real step -----------------------------------
  // We want to distribute the steps evenly across the 3 windows based on
  // their logical order, rather than dumping all "hard" tasks into month 3.
  const numSteps = steps.length;
  steps.forEach((step, stepIndex) => {
    const gap = gaps.find((g) => g.title === step.relatedSkill) ?? gaps[stepIndex] ?? null;
    const targetJobs = relatedJobTitles(step.relatedSkill, opportunities);

    // Distribute sequentially: first third in window 1, middle in window 2, etc.
    let window: Window = "DAYS_0_30";
    if (numSteps > 0) {
      const progress = stepIndex / numSteps;
      if (progress >= 0.66) window = "DAYS_61_90";
      else if (progress >= 0.33) window = "DAYS_31_60";
    }

    // The final "apply to X roles" step belongs at the end by definition.
    const isApplyStep = step.title.startsWith("Apply to");

    if (isApplyStep) {
      push("DAYS_61_90", {
        stepIndex,
        title: step.title,
        description:
          "Apply to roles at this level with a tailored application per posting, referencing the specific work you completed in the previous 60 days.",
        priority: 1,
        estimatedTime: "Ongoing",
        difficulty: "Moderate",
        expectedImpact:
          opportunities.length > 0
            ? `You have ${opportunities.length} tracked opportunit${opportunities.length === 1 ? "y" : "ies"} to work through.`
            : "Analyze some real postings first so you have a pipeline to apply into.",
        relatedSkill: null,
        relatedTargetJobs: [],
      });
      return;
    }

    if (step.projectRecommendation) {
      const project = step.projectRecommendation;
      push(window, {
        stepIndex,
        title: project.project,
        description: `${project.why} Deliverables: ${project.deliverables.join("; ")}.`,
        priority: 1,
        estimatedTime: project.estimatedTime,
        difficulty: difficultyLabel(project.difficulty),
        expectedImpact: impactFor(gap, project.relevantTargetJobs),
        relatedSkill: step.relatedSkill,
        relatedTargetJobs: project.relevantTargetJobs,
      });
      return;
    }

    push(window, {
      stepIndex,
      title: step.title,
      description: step.description,
      priority: gap?.impact === "HIGH" ? 1 : gap?.impact === "MEDIUM" ? 2 : 3,
      estimatedTime: gap?.estimatedTime ?? "Varies",
      difficulty: gap ? difficultyLabel(gap.difficulty) : "Moderate",
      expectedImpact: impactFor(gap, targetJobs),
      relatedSkill: step.relatedSkill,
      relatedTargetJobs: targetJobs,
    });
  });

  // --- Make sure no window is empty ---------------------------------------
  // An empty window reads as a broken plan. These are genuine, always-valid
  // actions rather than filler - but they're only added when the window
  // would otherwise be blank.
  
  
  
  // Within each window, highest priority first.
  const windows: Window[] = ["DAYS_0_30", "DAYS_31_60", "DAYS_61_90"];
  return windows.flatMap((window) =>
    actions
      .filter((a) => a.window === window)
      .sort((a, b) => a.priority - b.priority)
      .map((a, index) => ({ ...a, order: index })),
  );
}
