import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProPreview } from "@/components/guidance/pro-preview";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import type { PreviewData } from "@/lib/guidance/preview-data";

/**
 * THE NEXT STEP AFTER A FREE FIT REPORT.
 *
 * A free user used to reach the end of their report with nothing telling
 * them what to do next; the Pro tools sat further down as equal tiles.
 * This puts the one obvious next step - a resume rewritten for THIS job -
 * right under the scores, with a preview built from their own report
 * (strengths it would lead with, the job's keywords it would work in).
 * Pro members never see it.
 */
export function TailorUpsellCard({ preview, resumeHref }: { preview?: PreviewData; resumeHref?: string }) {
  const strengths = preview?.strengths ?? [];
  const keywords = preview?.keywords ?? [];
  const gaps = preview?.gaps ?? [];

  return (
    <section
      aria-labelledby="tailor-upsell-title"
      className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="tailor-upsell-title" className="font-semibold text-foreground">
            Next: a resume tailored to this job
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Work-ly rewrites your resume for this job, leading with your strongest proof in the posting&apos;s own words, and writes the cover
            letter. It uses only what&apos;s already on your resume and never adds skills you don&apos;t have.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:w-56">
        <UpgradeModal
          title="Tailor your resume for this job"
          defaultPlan="quarterly"
          preview={
            <ProPreview
              facts={[
                { label: "It would lead with", items: strengths },
                { label: "What the job asks for", items: keywords.slice(0, 6) },
                { label: "Gaps it leaves out rather than fakes", items: gaps.slice(0, 3) },
              ]}
              outputLabel="Your resume, rewritten for this job"
              lines={4}
            />
          }
        >
          <Button className="w-full gap-1.5">
            Tailor my resume for this job
            <ArrowRight className="size-4" />
          </Button>
        </UpgradeModal>
        {resumeHref && (
          <Button asChild variant="ghost" size="sm">
            <Link href={resumeHref}>See what you&apos;d get first</Link>
          </Button>
        )}
        <Link href="/sprint" className="text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Want a person to check it with you? The Application Sprint
        </Link>
      </div>
    </section>
  );
}
