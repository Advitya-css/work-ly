"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";
import { deleteJob, getJobById } from "@/lib/db/jobs";
import { jobInputSchema } from "@/lib/validations/job-input";
import { FREE_AI_LIMIT_MESSAGE, spendFreeAi } from "@/lib/ai/allowance";

export interface AnalyzeJobActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What was submitted, so a failed attempt never wipes the user's paste. */
  values?: { jobTitle: string; jobCompany: string; text: string; url: string };
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

  const values = {
    jobTitle: String(formData.get("jobTitle") ?? ""),
    jobCompany: String(formData.get("jobCompany") ?? ""),
    text: String(formData.get("text") ?? ""),
    url: String(formData.get("url") ?? ""),
  };

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
  // The page a captured job came from (LinkedIn, Naukri...) is kept as the
  // posting's link, but only as a plain http(s) URL.
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const keptUrl = /^https?:\/\/[^\s]{3,1500}$/i.test(sourceUrl) ? sourceUrl : undefined;
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  }

  if (!(await spendFreeAi(user))) {
    return { error: FREE_AI_LIMIT_MESSAGE, values };
  }

  const result = await submitParseAndAnalyzeJob(user.id, {
    inputMethod: parsed.data.inputMethod,
    text: parsed.data.text,
    url: parsed.data.inputMethod === "URL" ? parsed.data.url : keptUrl,
  });

  if ("error" in result) {
    return { error: result.error, values };
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
  revalidatePath("/applications");
  redirect("/applications");
}
