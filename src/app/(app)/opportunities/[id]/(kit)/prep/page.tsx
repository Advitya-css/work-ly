import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { loadKit } from "@/lib/kit/kit-data";
import { buildPreviewData } from "@/lib/guidance/preview-data";
import { previewOf } from "@/lib/saved-work-core";
import { getApplicationByOpportunityId } from "@/lib/db/applications";
import { PrepStudio } from "@/components/kit/prep-studio";
import { KitLocked } from "@/components/kit/kit-locked";
import { InterviewIntelButton } from "@/components/opportunities/interview-intel-button";

export const metadata: Metadata = { title: "Interview prep" };
export const maxDuration = 180;

export default async function KitPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const kit = await loadKit(user.id, id);
  // loadKit already scopes to this user; checked again here so it reads at a glance.
  if (!kit || kit.opportunity.userId !== user.id) notFound();

  if (!user.isPro) {
    const saved = kit.saved.interview?.data as { questions?: { question?: string }[] } | undefined;
    return (
      <KitLocked
        title={saved ? "Your interview prep for this job is saved" : "Know the questions before they ask"}
        body="What this interviewer is likely to ask you, aimed at your thin spots, each with the line from your own history to answer from and the answer in three beats. Then practise them out loud and get scored."
      >
        <InterviewIntelButton
          opportunityId={id}
          isPro={false}
          savedPreview={saved ? previewOf(saved.questions?.at(0)?.question) : null}
          lockedLabel="Interview prep"
          preview={buildPreviewData({
            requiredSkills: kit.job.requiredSkills,
            preferredSkills: kit.job.preferredSkills,
            strengths: kit.opportunity.analysis?.strengths,
            gaps: kit.opportunity.analysis?.gaps,
            experiences: kit.profile.experiences,
          })}
        />
      </KitLocked>
    );
  }

  const application = await getApplicationByOpportunityId(id).catch(() => null);
  return <PrepStudio opportunityId={id} applicationId={application && application.userId === user.id ? application.id : null} />;
}
