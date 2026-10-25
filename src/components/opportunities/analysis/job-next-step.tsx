import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TailorApplicationButton } from "@/components/opportunities/tailor-application-button";
import { InsiderAccessButton } from "@/components/opportunities/insider-access-button";
import { InterviewIntelButton } from "@/components/opportunities/interview-intel-button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";

/**
 * THE NEXT STEP, right under the verdict: one primary action (a resume
 * written for this job) and the three other things you'd want before
 * applying, as plain buttons. Replaces a four-tile "Tools" grid with a
 * paragraph on every tile, plus a separate upgrade card above it.
 */
export function JobNextStep({
  opportunityId,
  isPro,
  preview,
  company,
  resumeReady = false,
  sender,
  saved,
}: {
  opportunityId: string;
  isPro: boolean;
  preview?: PreviewData;
  company?: string | null;
  /** A tailored resume is already saved for this job. */
  resumeReady?: boolean;
  /** Name and contact line for downloaded letters. */
  sender?: { name: string; contact: string };
  /** Free accounts: first words of anything saved for this job during a trial. */
  saved?: { cover?: string | null; note?: string | null; interview?: string | null };
}) {
  const resumeHref = `/opportunities/${opportunityId}/resume`;

  const primary = !isPro && resumeReady ? (
    <Button asChild size="lg" className="gap-2">
      <Link href={resumeHref}>
        <FileText className="size-4" />
        See my saved resume
      </Link>
    </Button>
  ) : isPro ? (
    <Button asChild size="lg" className="gap-2">
      <Link href={resumeReady ? resumeHref : `${resumeHref}?build=1`}>
        <FileText className="size-4" />
        {resumeReady ? "Open my tailored resume" : "Build my tailored resume"}
      </Link>
    </Button>
  ) : (
    <UpgradeModal
      title="Tailor your resume for this job"
      defaultPlan="quarterly"
      preview={
        <ProPreview
          facts={[
            { label: "It would lead with", items: preview?.strengths ?? [] },
            { label: "What the job asks for", items: (preview?.keywords ?? []).slice(0, 6) },
            { label: "Gaps it leaves out rather than fakes", items: (preview?.gaps ?? []).slice(0, 3) },
          ]}
          outputLabel="Your resume, rewritten for this job"
          lines={4}
        />
      }
    >
      <Button size="lg" className="gap-2">
        Tailor my resume for this job
        <ArrowRight className="size-4" />
      </Button>
    </UpgradeModal>
  );

  return (
    <section
      aria-labelledby="next-step-title"
      className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="next-step-title" className="text-base font-semibold text-foreground">
            {resumeReady ? "Your resume for this job is ready" : "Apply with a resume written for this job"}
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            {resumeReady && !isPro
              ? "Still saved in your account. Pro opens it again for editing and download."
              : resumeReady
              ? "Saved for this job. Download it as PDF or Word, or keep refining it."
              : "Rewritten from what's already on your profile, in this posting's language. Nothing invented."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
          {primary}
          {!isPro && !resumeReady && (
            <Link href={resumeHref} className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              See what you&apos;d get first
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Also for this job</span>
        <TailorApplicationButton opportunityId={opportunityId} isPro={isPro} preview={preview} sender={sender} company={company} savedPreview={saved?.cover} label="Cover letter" lockedLabel="Cover letter" />
        <InsiderAccessButton opportunityId={opportunityId} isPro={isPro} preview={preview} company={company} savedPreview={saved?.note} label="Note to the hiring manager" lockedLabel="Note to the hiring manager" />
        <InterviewIntelButton opportunityId={opportunityId} isPro={isPro} preview={preview} savedPreview={saved?.interview} label="Likely interview questions" lockedLabel="Likely interview questions" />
      </div>
    </section>
  );
}
