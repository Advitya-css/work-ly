"use server";

import { FREE_AI_LIMIT_MESSAGE, spendFreeAi } from "@/lib/ai/allowance";
import { recordProToolUse } from "@/lib/payments/refund-window";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { submitAndAnalyzeDreamJob } from "@/lib/dream-job/analyze-dream-job";
import { deleteDreamJob, getDreamJobById, listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { dreamJobInputSchema } from "@/lib/validations/dream-job";

export interface DreamJobActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

/** Runs submit -> parse -> analyze and redirects straight to the result page on success. */
export async function analyzeDreamJobAction(
  _prevState: DreamJobActionState,
  formData: FormData,
): Promise<DreamJobActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = dreamJobInputSchema.safeParse({
    dreamRole: formData.get("dreamRole") ?? "",
    description: formData.get("description") ?? "",
    companyName: formData.get("companyName") ?? "",
    portfolio: formData.get("portfolio") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  // The first dream-job analysis is free; after that it's a Pro tool. The
  // form already enforces this - checked here too so the rule doesn't live
  // only in the browser.
  if (!user.isPro && (await listDreamJobsByUserId(user.id)).some((dj) => dj.status === "PARSED")) {
    return { error: "Your free dream-job analysis has been used. Upgrade to Pro to analyze more." };
  }

  if (!(await spendFreeAi(user))) return { error: FREE_AI_LIMIT_MESSAGE };
  if (user.isPro) await recordProToolUse(user.id);

  const result = await submitAndAnalyzeDreamJob(user.id, parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/dream-job");
  redirect(`/dream-job/${result.dreamJobId}`);
}

export async function deleteDreamJobAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await getDreamJobById(id);
  if (!existing || existing.userId !== user.id) return;

  await deleteDreamJob(id);
  revalidatePath("/dream-job");
}
