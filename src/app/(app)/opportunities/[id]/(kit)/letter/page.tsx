import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { loadKit } from "@/lib/kit/kit-data";
import { buildPreviewData } from "@/lib/guidance/preview-data";
import { previewOf } from "@/lib/saved-work-core";
import { LetterStudio } from "@/components/kit/letter-studio";
import { KitLocked } from "@/components/kit/kit-locked";
import { TailorApplicationButton } from "@/components/opportunities/tailor-application-button";

export const metadata: Metadata = { title: "Cover letter" };
export const maxDuration = 180;

export default async function KitLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const kit = await loadKit(user.id, id);
  // loadKit already scopes to this user; checked again here so it reads at a glance.
  if (!kit || kit.opportunity.userId !== user.id) notFound();

  if (!user.isPro) {
    const saved = kit.saved.cover?.data as { coverLetter?: string } | undefined;
    return (
      <KitLocked
        title={saved ? "Your cover letter for this job is saved" : "A cover letter for this exact posting"}
        body="Opens with what this team needs, then your two strongest real proofs for it. Pick the tone and length, edit it on the page, download PDF or Word."
      >
        <TailorApplicationButton
          opportunityId={id}
          isPro={false}
          savedPreview={saved ? previewOf(saved.coverLetter) : null}
          lockedLabel="Cover letter"
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

  const sender = { name: user.name ?? "", contact: [user.email, kit.profile.profile?.location].filter(Boolean).join(" · ") };
  return <LetterStudio opportunityId={id} sender={sender} company={kit.job.company} />;
}
