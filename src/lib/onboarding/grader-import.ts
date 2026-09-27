"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { buildProfileFromResumeText } from "@/lib/career/parse-document";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";
import { creditReferralOnActivation, markUserOnboarded } from "@/lib/db/users";
import { checkRateLimit } from "@/lib/rate-limit";
import { FREE_AI_LIMIT_MESSAGE, spendFreeAi } from "@/lib/ai/allowance";
import { safeMessage } from "@/lib/errors";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";

/**
 * FROM THE FREE GRADER INTO AN ACCOUNT.
 *
 * Someone who just checked their resume against a job on /free-grader and
 * then signs up shouldn't have to paste both again. The grader keeps the
 * two texts in their browser; this turns them into a career profile (only
 * when the account has none yet - an existing profile is never duplicated
 * or overwritten) and a tracked job with the full Fit report, and returns
 * where to send them.
 */
export async function importFromGraderAction(input: {
  resumeText: string;
  jobText: string;
}): Promise<{ opportunityId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };

  const resumeText = stripPromptInjectionMarkers(String(input.resumeText ?? "").slice(0, 20_000)).trim();
  const jobText = stripPromptInjectionMarkers(String(input.jobText ?? "").slice(0, 20_000)).trim();
  if (resumeText.length < 200 || jobText.length < 120) {
    return { error: "That saved resume or job is too short to use. Add your resume below instead." };
  }

  // Same cap as uploading a resume: each import is a full AI parse.
  if (!(await checkRateLimit(`resume_parse_${user.id}`, 10, 600))) {
    return { error: "Too many attempts recently. Please try again in a few minutes." };
  }

  try {
    const existing = await getFullCareerProfile(user.id);
    const hasProfile = existing.experiences.length > 0 || existing.skills.length > 0;
    if (!hasProfile) {
      await buildProfileFromResumeText(user.id, resumeText);
      try {
        await creditReferralOnActivation(user.id);
      } catch (error) {
        console.warn("[workly:referral] credit failed:", error instanceof Error ? error.message : error);
      }
    }
    await markUserOnboarded(user.id);

    if (!(await spendFreeAi(user))) return { error: FREE_AI_LIMIT_MESSAGE };
    const result = await submitParseAndAnalyzeJob(user.id, { inputMethod: "PASTED_TEXT", text: jobText });
    if ("error" in result) return { error: result.error };

    revalidatePath("/opportunities");
    revalidatePath("/dashboard");
    return { opportunityId: result.opportunityId };
  } catch (error) {
    return { error: safeMessage(error, "importFromGraderAction", "We couldn't use that resume. Please add it below instead.") };
  }
}
