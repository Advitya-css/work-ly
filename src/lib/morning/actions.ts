"use server";

import { getCurrentUser } from "@/lib/auth";
import { setOpportunityStatusAction } from "@/lib/opportunities/actions";
import { getApplicationByOpportunityId, updateApplication } from "@/lib/db/applications";
import { getOpportunityById } from "@/lib/db/opportunities";
import { TAILORED_CV_LABEL } from "@/lib/applications/cv-version";
import { getSavedOutput } from "@/lib/saved-outputs";

/**
 * "I've applied", from the morning list. Same as marking the job applied
 * anywhere else (it creates the tracker entry), plus one thing only this
 * list knows: the resume that went out was the one Work-ly wrote overnight,
 * so the application is recorded as sent with the tailored resume. That's
 * what lets the outcomes page compare tailored against not. It only fills
 * a blank, never overwrites what they entered.
 */
export async function markMorningAppliedAction(
  opportunityId: string,
): Promise<{ applicationId: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity || opportunity.userId !== user.id) return { error: "That job isn't in your list any more." };

  const { applicationId } = await setOpportunityStatusAction(opportunityId, "APPLIED");
  if (!applicationId) return { error: "Couldn't add it to your tracker. Try again." };

  try {
    const [resume, application] = await Promise.all([
      getSavedOutput(user.id, "resume", opportunityId),
      getApplicationByOpportunityId(opportunityId),
    ]);
    if (resume && application && !application.cvVersion?.trim()) {
      await updateApplication(application.id, { cvVersion: TAILORED_CV_LABEL });
    }
  } catch (error) {
    console.warn("[workly:morning] couldn't tag the CV version:", error instanceof Error ? error.message : error);
  }
  return { applicationId };
}
