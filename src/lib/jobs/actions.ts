"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";
import { deleteJob, getJobById } from "@/lib/db/jobs";
import { jobInputSchema } from "@/lib/validations/job-input";

export interface AnalyzeJobActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] = issue.message;
  return fieldErrors;
}

/**
 * Runs the full submit -> parse -> analyze pipeline and redirects straight
 * to the result page on success. A thrown redirect() is Next.js's normal
 * control flow here, not an error - everything else returns state instead.
 */
export async function analyzeJobAction(
  _prevState: AnalyzeJobActionState,
  formData: FormData,
): Promise<AnalyzeJobActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = jobInputSchema.safeParse({
    inputMethod: formData.get("inputMethod"),
    // Radix Tabs unmounts the inactive tab's content, so whichever of
    // text/url isn't the active input method is absent from the FormData
    // entirely - formData.get() returns null (not undefined) for those,
    // which z.string().optional() does not accept. Normalize to "".
    text: [
      formData.get("jobTitle") ? "Title: " + formData.get("jobTitle") : "",
      formData.get("jobCompany") ? "Company: " + formData.get("jobCompany") : "",
      formData.get("text") ?? ""
    ].filter(Boolean).join("\n\n"),
    url: formData.get("url") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const result = await submitParseAndAnalyzeJob(user.id, {
    inputMethod: parsed.data.inputMethod,
    text: parsed.data.text,
    url: parsed.data.url,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/analyze-job");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${result.opportunityId}`);
}

export async function deleteJobAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await getJobById(user.id, id);
  if (!existing || existing.userId !== user.id) return;

  await deleteJob(id);
  revalidatePath("/analyze-job");
  revalidatePath("/opportunities");
}
