"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { generatePathway } from "@/lib/pathway/generate";
import {
  getActionById,
  getPathwayById,
  getStepById,
  setActionStatus,
  setStepStatus,
  updateActionContent,
  updateStepContent,
} from "@/lib/db/career-pathways";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { getDreamJobById } from "@/lib/db/dream-jobs";
import { createSkill } from "@/lib/db/skills";
import { scoringProvider } from "@/lib/scoring";
import { pool } from "@/lib/db/pool";
import { simulate } from "@/lib/pathway/what-if";
import type { Scenario, SimulationResult } from "@/lib/pathway/what-if-types";
import type { PathwayItemStatus } from "@/lib/db/types";

/**
 * Every mutation here re-checks that the row belongs to the signed-in user
 * by walking back to the pathway's userId - step and action IDs are
 * guessable-ish cuids, and these are the only writes in Phase 6.
 */
async function requireOwnedStep(stepId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const step = await getStepById(stepId);
  if (!step) return null;
  const pathway = await getPathwayById(step.pathwayId);
  if (!pathway || pathway.userId !== user.id) return null;
  return step;
}

async function requireOwnedAction(actionId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const action = await getActionById(actionId);
  if (!action) return null;
  const pathway = await getPathwayById(action.pathwayId);
  if (!pathway || pathway.userId !== user.id) return null;
  return action;
}

function revalidatePathwayViews() {
  revalidatePath("/career-path");
  revalidatePath("/dashboard");
}

export interface GeneratePathwayState {
  error?: string;
}

export async function generatePathwayAction(): Promise<GeneratePathwayState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await generatePathway(user.id);
  if ("error" in result) return { error: result.error };

  revalidatePathwayViews();
  return {};
}

/**
 * The "Build My Pathway" entry point from a specific Dream Job's analysis
 * page. Two things distinguish this from generatePathwayAction above: the
 * pathway is scoped to *this* dream job rather than whichever one happens
 * to be first, and success lands the user on /career-path directly - the
 * dream-job page previously had a same-named button that only anchor-
 * scrolled to a static "Improvement plan" list further down the same page
 * and never touched the real pathway system at all, which is exactly the
 * "confusing/mixed" experience this replaces.
 */
export async function generatePathwayFromDreamJobAction(dreamJobId: string): Promise<GeneratePathwayState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await generatePathway(user.id, { dreamJobId });
  if ("error" in result) return { error: result.error };

  revalidatePathwayViews();
  redirect("/career-path");
}

export async function setStepStatusAction(stepId: string, status: PathwayItemStatus): Promise<void> {
  const step = await requireOwnedStep(stepId);
  if (!step) return;
  await setStepStatus(stepId, status);
  
  if (status === "COMPLETED" && step.relatedSkill) {
    const pathway = await getPathwayById(step.pathwayId);
    if (pathway) {
      // Silently auto-add the acquired skill to the user's profile
      await createSkill(pathway.userId, { name: step.relatedSkill, proficiency: "BEGINNER" });
      
      // We don't overwrite the entire pathway, but we recalculate startingReadiness to reflect the jump!
      const profile = await getFullCareerProfile(pathway.userId);
      const careerGoal = await getPrimaryCareerGoal(pathway.userId);
      const dreamJob = pathway.dreamJobId ? await getDreamJobById(pathway.dreamJobId) : null;
      if (dreamJob && dreamJob.status === "PARSED") {
        const fit = scoringProvider.analyzeFit({ profile, careerGoal, job: dreamJob as any });
        await pool.query('UPDATE career_pathways SET "startingReadiness" = $1 WHERE id = $2', [fit.fitScore, pathway.id]);
      }
    }
  }

  revalidatePathwayViews();
}

export async function setActionStatusAction(actionId: string, status: PathwayItemStatus): Promise<void> {
  const action = await requireOwnedAction(actionId);
  if (!action) return;
  await setActionStatus(actionId, status);
  revalidatePathwayViews();
}

export async function updateStepAction(
  stepId: string,
  fields: { title?: string; description?: string; note?: string | null },
): Promise<void> {
  const step = await requireOwnedStep(stepId);
  if (!step) return;
  await updateStepContent(stepId, fields);
  revalidatePathwayViews();
}

export async function updateActionAction(
  actionId: string,
  fields: { title?: string; description?: string; note?: string | null },
): Promise<void> {
  const action = await requireOwnedAction(actionId);
  if (!action) return;
  await updateActionContent(actionId, fields);
  revalidatePathwayViews();
}

/**
 * Runs a what-if simulation. Nothing is written - see lib/pathway/what-if.ts:
 * a simulated profile exists for the duration of this call and no longer.
 */
export async function simulateScenarioAction(
  dreamJobId: string,
  scenario: Scenario,
): Promise<{ result: SimulationResult } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!scenario.value.trim()) {
    return { error: "Enter a value to simulate." };
  }

  const dreamJob = await getDreamJobById(dreamJobId);
  if (!dreamJob || dreamJob.userId !== user.id) return { error: "Target role not found." };
  if (dreamJob.status !== "PARSED") return { error: "That target role hasn't finished being analyzed yet." };

  const [profile, careerGoal] = await Promise.all([
    getFullCareerProfile(user.id),
    getPrimaryCareerGoal(user.id),
  ]);

  return { result: simulate({ profile, careerGoal, dreamJob, scenario }) };
}
