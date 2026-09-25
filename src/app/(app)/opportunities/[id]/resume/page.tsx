import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ProPreview } from "@/components/guidance/pro-preview";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { buildPreviewData } from "@/lib/guidance/preview-data";
import { Button } from "@/components/ui/button";
import { ResumeBuilder } from "@/components/resume/resume-builder";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";

export const metadata: Metadata = { title: "Tailored Resume" };
// Building the resume is one model call; give it room.
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

export default async function TailoredResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const opportunity = await getOpportunityWithJobById(user.id, id);
  if (!opportunity || opportunity.userId !== user.id) notFound();

  const job = opportunity.job;
  const back = (
    <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground print:hidden">
      <Link href={`/opportunities/${opportunity.id}`}>
        <ArrowLeft />
        Back to opportunity
      </Link>
    </Button>
  );

  if (!user.isPro) {
    const full = await getFullCareerProfile(user.id);
    const preview = buildPreviewData({
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills,
      strengths: opportunity.analysis?.strengths,
      gaps: opportunity.analysis?.gaps,
      weaknesses: opportunity.analysis?.weaknesses,
      experiences: full.experiences,
    });
    return (
      <div className="flex flex-col gap-6">
        {back}
        <PageHeader
          title="Resume tailored to this job"
          description={`For ${job.title ?? "this role"}${job.company ? ` at ${job.company}` : ""}. An apply-ready resume rewritten only from facts on your profile, in about a minute.`}
        />
        <ProPreview
          intro={`Work-ly would reorder and rewrite ${
            preview.roleCount > 0 ? `your ${preview.roleCount} role${preview.roleCount === 1 ? "" : "s"}` : "your experience"
          }${full.skills.length ? ` and ${full.skills.length} skills` : ""} for this posting, keep every real number, and never add anything you haven't done.`}
          facts={[
            { label: "Keywords from this posting (used only where your experience backs them up)", items: preview.keywords },
            { label: "Where you already fit", items: preview.strengths },
          ]}
          outputLabel="Your tailored resume, ready to print or save as PDF"
          lines={6}
          className="max-w-3xl"
        >
          <UpgradeModal
            title="Unlock tailored resumes"
            description="Get an apply-ready resume for this job, rewritten from your real experience, in about a minute."
          >
            <Button className="w-full gap-2 sm:w-fit">
              <Lock className="size-4" />
              Get my tailored resume (Pro)
            </Button>
          </UpgradeModal>
        </ProPreview>
      </div>
    );
  }

  const profile = await getFullCareerProfile(user.id);

  return (
    <div className="flex flex-col gap-6">
      {back}
      <div className="print:hidden">
        <PageHeader
          title="Tailored resume"
          description={`For ${job.title ?? "this role"}${job.company ? ` at ${job.company}` : ""}. Built only from facts on your profile.`}
        />
      </div>
      <ResumeBuilder
        opportunityId={opportunity.id}
        candidate={{
          name: user.name ?? "",
          email: user.email,
          location: profile.profile?.location ?? null,
          headline: profile.profile?.headline ?? profile.profile?.currentRole ?? null,
        }}
        jobLabel={`${job.title ?? "Role"}${job.company ? ` - ${job.company}` : ""}`}
      />
    </div>
  );
}
