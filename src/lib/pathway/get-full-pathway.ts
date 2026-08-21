import "server-only";

import {
  getActivePathwayByUserId,
  getPathwayById,
  listActionsByPathwayId,
  listStepsByPathwayId,
} from "@/lib/db/career-pathways";
import type { FullPathway, PathwayItemStatus } from "@/lib/db/types";

/** Assembles a pathway with its steps and actions - everything /career-path renders. */
export async function getActiveFullPathway(userId: string): Promise<FullPathway | null> {
  const pathway = await getActivePathwayByUserId(userId);
  if (!pathway) return null;
  const [steps, actions] = await Promise.all([
    listStepsByPathwayId(pathway.id),
    listActionsByPathwayId(pathway.id),
  ]);
  return { ...pathway, steps, actions };
}

export async function getFullPathwayById(id: string): Promise<FullPathway | null> {
  const pathway = await getPathwayById(id);
  if (!pathway) return null;
  const [steps, actions] = await Promise.all([
    listStepsByPathwayId(pathway.id),
    listActionsByPathwayId(pathway.id),
  ]);
  return { ...pathway, steps, actions };
}

export interface PathwayProgress {
  completed: number;
  skipped: number;
  total: number;
  /// 0-100. Skipped items count as resolved - a user who deliberately
  /// skipped a step shouldn't be stuck at 90% forever.
  percent: number;
  /// 1-based position of the first unresolved step, for "Step 2 of 6".
  currentStepNumber: number;
  totalSteps: number;
}

function isResolved(status: PathwayItemStatus): boolean {
  return status === "COMPLETED" || status === "SKIPPED";
}

/**
 * Progress is measured over STEPS, not actions - steps are the milestones
 * the user actually thinks in terms of ("Step 2 of 6"), and the 30/60/90
 * actions churn as the plan is regenerated.
 */
export function computeProgress(pathway: FullPathway): PathwayProgress {
  const total = pathway.steps.length;
  const completed = pathway.steps.filter((s) => s.status === "COMPLETED").length;
  const skipped = pathway.steps.filter((s) => s.status === "SKIPPED").length;
  const resolved = completed + skipped;

  const firstUnresolvedIndex = pathway.steps.findIndex((s) => !isResolved(s.status));

  return {
    completed,
    skipped,
    total,
    percent: total === 0 ? 0 : Math.round((resolved / total) * 100),
    // When everything is resolved, report the final step rather than 0.
    currentStepNumber: firstUnresolvedIndex === -1 ? total : firstUnresolvedIndex + 1,
    totalSteps: total,
  };
}

/**
 * The next thing the user should actually do - drives the dashboard widget.
 *
 * An action belonging to a step the user completed or skipped is NOT next:
 * skipping "Reposition your profile" should take its actions off the table
 * too, otherwise the dashboard keeps advertising work the user explicitly
 * declined. Actions with no parent step (profile hygiene, CV fixes) stand
 * on their own and stay eligible.
 */
export function nextUpFor(pathway: FullPathway): { label: string; stepTitle: string | null } | null {
  const stepById = new Map(pathway.steps.map((s) => [s.id, s]));

  const nextAction = pathway.actions.find((a) => {
    if (a.status !== "PENDING") return false;
    if (!a.stepId) return true;
    const step = stepById.get(a.stepId);
    return !step || !isResolved(step.status);
  });

  if (nextAction) {
    const step = nextAction.stepId ? stepById.get(nextAction.stepId) : undefined;
    return { label: nextAction.title, stepTitle: step?.title ?? null };
  }

  const nextStep = pathway.steps.find((s) => !isResolved(s.status));
  return nextStep ? { label: nextStep.title, stepTitle: nextStep.title } : null;
}
