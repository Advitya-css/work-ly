"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { getOpportunityById, setOpportunitySaved, setOpportunityStatus } from "@/lib/db/opportunities";
import { createApplicationFromOpportunityAction } from "@/lib/applications/actions";
import type { OpportunityStatus } from "@/lib/db/types";

async function requireOwnedOpportunity(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const existing = await getOpportunityById(id);
  if (!existing || existing.userId !== user.id) throw new Error("Opportunity not found.");
  return existing;
}

export async function toggleOpportunitySavedAction(id: string, nextSaved: boolean): Promise<void> {
  await requireOwnedOpportunity(id);
  await setOpportunitySaved(id, nextSaved);
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
}

export async function setOpportunityStatusAction(id: string, status: OpportunityStatus): Promise<void> {
  await requireOwnedOpportunity(id);
  await setOpportunityStatus(id, status);

  // Phase 4 shipped PREPARING/APPLIED as lightweight markers, with the
  // schema noting they'd "feed into" a real tracker later. This is that
  // wiring: marking an opportunity applied now creates the Application row
  // too, so the pipeline and the analytics see it without the user having
  // to record the same thing twice. Idempotent - the create action returns
  // the existing application if one already exists for this opportunity.
  if (status === "APPLIED" || status === "PREPARING") {
    await createApplicationFromOpportunityAction(id, status === "APPLIED" ? "APPLIED" : "PREPARING");
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}
