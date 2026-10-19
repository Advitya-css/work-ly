import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { JobAnalysisView } from "@/components/opportunities/analysis/job-analysis-view";
import { JobNextStep } from "@/components/opportunities/analysis/job-next-step";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { OpportunityStatusControls } from "@/components/opportunities/opportunity-status-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { recordFunnelStep } from "@/lib/attribution";
import { buildPreviewData } from "@/lib/guidance/preview-data";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getCurrentUser } from "@/lib/auth";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { OPPORTUNITY_STATUS_LABEL, OPPORTUNITY_STATUS_VARIANT } from "@/lib/jobs/labels";

export const metadata: Metadata = { title: "Opportunity" };
// Re-analysis and the AI tools on this page call the model.
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const opportunity = await getOpportunityWithJobById(user.id, id);
  if (!opportunity || opportunity.userId !== user.id) notFound();

  const { job, analysis } = opportunity;
  if (!analysis) notFound();

  // Free reports carry the "tailor my resume" offer: count the view against
  // the visitor's channel (lib/attribution.ts).
  if (!user.isPro) await recordFunnelStep("paywall");

  // Real inputs for the locked Pro tools' previews - nothing generated.
  const toolPreview = user.isPro
    ? undefined
    : buildPreviewData({
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        weaknesses: analysis.weaknesses,
        experiences: (await getFullCareerProfile(user.id)).experiences,
      });

  return (
    <JobAnalysisView
      job={job}
      analysis={analysis}
      priority={{ score: opportunity.priorityScore, breakdown: opportunity.priorityBreakdown ?? null }}
      backLink={
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/opportunities">
            <ArrowLeft />
            Opportunities
          </Link>
        </Button>
      }
      actions={
        <>
          <OpportunityStatusControls
            id={opportunity.id}
            isSaved={opportunity.isSaved}
            status={opportunity.status}
            roleTitle={job.title}
            company={job.company}
          />
          <DeleteJobButton id={job.id} label={job.title ?? "this opportunity"} />
        </>
      }
      statusBadge={
        opportunity.status !== "DISCOVERED" ? (
          <Badge variant={OPPORTUNITY_STATUS_VARIANT[opportunity.status]}>{OPPORTUNITY_STATUS_LABEL[opportunity.status]}</Badge>
        ) : undefined
      }
      nextStep={<JobNextStep opportunityId={opportunity.id} isPro={user.isPro ?? false} preview={toolPreview} company={opportunity.job.company} />}
    />
  );
}
