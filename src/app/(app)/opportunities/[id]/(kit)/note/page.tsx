import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { loadKit } from "@/lib/kit/kit-data";
import { buildPreviewData } from "@/lib/guidance/preview-data";
import { previewOf } from "@/lib/saved-work-core";
import { NoteStudio } from "@/components/kit/note-studio";
import { KitLocked } from "@/components/kit/kit-locked";
import { InsiderAccessButton } from "@/components/opportunities/insider-access-button";

export const metadata: Metadata = { title: "Note to the hiring manager" };
export const maxDuration = 180;

export default async function KitNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const kit = await loadKit(user.id, id);
  // loadKit already scopes to this user; checked again here so it reads at a glance.
  if (!kit || kit.opportunity.userId !== user.id) notFound();

  if (!user.isPro) {
    const saved = kit.saved.note?.data as { email?: string } | undefined;
    return (
      <KitLocked
        title={saved ? "Your note to the hiring manager is saved" : "Reach the person who decides"}
        body="Who to look for at this company and a search that finds them, a short email built on one real proof, a LinkedIn request under 300 characters, and a follow-up for when there's no reply."
      >
        <InsiderAccessButton
          opportunityId={id}
          isPro={false}
          company={kit.job.company}
          savedPreview={saved ? previewOf(saved.email) : null}
          lockedLabel="Note to the hiring manager"
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

  return <NoteStudio opportunityId={id} company={kit.job.company} />;
}
