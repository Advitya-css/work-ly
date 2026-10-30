import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconProfile } from "@/components/icons";
import { ProPreview } from "@/components/guidance/pro-preview";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Button } from "@/components/ui/button";
import { LinkedInMakeover } from "@/components/career/linkedin-makeover";
import { SavedLockedPreview } from "@/components/paywall/saved-locked-preview";
import { previewOf } from "@/lib/saved-work-core";
import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { getSavedOutput } from "@/lib/saved-outputs";
import type { LinkedInMakeover as Makeover } from "@/lib/career/linkedin-core";

export const metadata: Metadata = { title: "LinkedIn profile" };
export const maxDuration = 120;

export default async function LinkedInPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, goal, saved] = await Promise.all([
    getFullCareerProfile(user.id),
    getPrimaryCareerGoal(user.id),
    getSavedOutput<Makeover>(user.id, "linkedin", "profile"),
  ]);
  const targetRole = goal?.primaryTargetRole?.trim() || null;
  const currentHeadline = profile.profile?.headline ?? profile.profile?.currentRole ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="LinkedIn profile"
        description={targetRole ? `Written to be found for ${targetRole} roles.` : "Written to be found for your next role."}
        icon={IconProfile}
        area="career"
      />
      <SectionTabs section="career" />

      {user.isPro ? (
        <LinkedInMakeover
          initial={saved?.data ?? null}
          initialSavedAt={saved?.savedAt ?? null}
          initialEdited={Boolean(saved?.edited)}
          currentHeadline={currentHeadline}
          targetRole={targetRole}
          person={{ name: user.name ?? "", location: profile.profile?.location ?? null }}
        />
      ) : saved ? (
        <div className="flex max-w-3xl flex-col gap-4">
          <SavedLockedPreview
            label="Saved for you: your new headline"
            visible={saved.data.headlines.at(0)?.text ?? ""}
            lines={1}
          />
          <SavedLockedPreview label="Your About section" visible={previewOf(saved.data.about, 140)} lines={4} />
          <UpgradeModal
            title="Your LinkedIn makeover is saved"
            description="Pro opens all three headlines, your full About section and the skills to pin, ready to copy."
            defaultPlan="quarterly"
          >
            <Button className="w-full gap-2 sm:w-fit">
              <Lock className="size-4" />
              Unlock my LinkedIn makeover
            </Button>
          </UpgradeModal>
        </div>
      ) : (
        <ProPreview
          heading="What you'd get"
          intro="Recruiters search LinkedIn by headline and skim the About section. Work-ly rewrites both for the role you want, from your real experience, plus the five skills to pin."
          facts={[
            { label: "Your headline now", items: currentHeadline ? [currentHeadline] : [] },
            { label: "Aimed at", items: targetRole ? [targetRole] : [] },
            { label: "Skills it would choose from", items: profile.skills.filter((s) => !s.isTransferable).slice(0, 8).map((s) => s.name) },
          ]}
          outputLabel="Three headlines, your About section and top skills"
          lines={5}
          className="max-w-3xl"
        >
          <UpgradeModal title="Unlock the LinkedIn makeover" defaultPlan="quarterly">
            <Button className="w-full gap-2 sm:w-fit">
              <Lock className="size-4" />
              Write my LinkedIn profile (Pro)
            </Button>
          </UpgradeModal>
        </ProPreview>
      )}
    </div>
  );
}
