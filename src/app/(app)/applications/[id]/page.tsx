import type { Metadata } from "next";
import { placeLine } from "@/lib/places";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  StatusPicker,
  ApplicationEditor,
  ContactsEditor,
  InterviewsEditor,
} from "@/components/applications/application-detail-controls";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { InterviewPrepCard } from "@/components/applications/interview-prep-card";
import { TechnicalChallengeCard } from "@/components/applications/technical-challenge-card";
import { SalaryNegotiatorCard } from "@/components/applications/salary-negotiator-card";
import { ResumeTailorCard } from "@/components/applications/resume-tailor-card";
import { ApplicationStrategyCard } from "@/components/applications/application-strategy-card";
import { FollowUpTemplateCard } from "@/components/applications/follow-up-template-card";
import { AcceptOfferCard } from "@/components/applications/accept-offer-card";
import { ApplicationNextStep, applicationStep } from "@/components/applications/application-next-step";
import { Fold } from "@/components/shared/fold";
import { buildPreviewData } from "@/lib/guidance/preview-data";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { formatSalaryRange, formatDay } from "@/lib/format";
import { APPLICATION_OUTCOME_LABEL } from "@/lib/applications/labels";

export const metadata: Metadata = { title: "Application" };

function Milestone({ label, at }: { label: string; at: Date | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {at ? (
        <CheckCircle2 className="size-4 shrink-0 text-success" />
      ) : (
        <div className="size-4 shrink-0 rounded-full border border-border" />
      )}
      <span className={at ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      {at && (
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {formatDay(at)}
        </span>
      )}
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const application = await getApplicationWithJobById(user.id, id);
  if (!application || application.userId !== user.id) notFound();

  const { job, opportunity } = application;
  const detailLine = [application.company, placeLine(application.location, application.country, " · ")]
    .filter(Boolean)
    .join(" · ");
  // Real inputs for the locked Pro tools' previews - nothing generated.
  const preview = user.isPro
    ? undefined
    : buildPreviewData({
        requiredSkills: job?.requiredSkills,
        preferredSkills: job?.preferredSkills,
        strengths: application.analysis?.strengths,
        gaps: application.analysis?.gaps,
        weaknesses: application.analysis?.weaknesses,
        experiences: (await getFullCareerProfile(user.id)).experiences,
      });

  // Mirrors FollowUpTemplateCard's own rule, so the roadmap can say whether
  // the card is on the page yet.
  const lastMilestone = application.reachedInterviewAt ?? application.reachedAssessmentAt ?? application.dateApplied;
  const followUpShown =
    ["APPLIED", "ASSESSMENT", "INTERVIEW", "FINAL_INTERVIEW"].includes(application.status) &&
    lastMilestone != null &&
    Date.now() - new Date(lastMilestone).getTime() >= 7 * 24 * 60 * 60 * 1000;

  const prepStage = application.status === "SAVED" || application.status === "PREPARING";

  const offeredSalary = formatSalaryRange(
    application.salaryOffered,
    null,
    application.salaryCurrency,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link href="/applications">
            <ArrowLeft />
            Back to Applications
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <StatusPicker application={application} />
          <DeleteApplicationButton id={application.id} label={application.roleTitle} />
        </div>
      </div>

      <PageHeader title={application.roleTitle} description={detailLine || undefined} />

      <ApplicationNextStep
        status={application.status}
        step={applicationStep({
          id: application.id,
          status: application.status,
          opportunityId: application.opportunityId,
          dateApplied: application.dateApplied,
          followUpShown,
          lastMilestone,
          isPro: user.isPro ?? false,
        })}
        milestones={{
          applied: Boolean(application.dateApplied),
          assessment: Boolean(application.reachedAssessmentAt),
          interview: Boolean(application.reachedInterviewAt),
          offer: Boolean(application.reachedOfferAt),
        }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {application.status === "OFFER" && (
            <>
              <div id="tool-counter-offer" className="scroll-mt-24">
                <SalaryNegotiatorCard applicationId={application.id} />
              </div>
              <div id="tool-accept-offer" className="scroll-mt-24">
                <AcceptOfferCard
                  applicationId={application.id}
                  roleTitle={application.roleTitle}
                  company={application.company}
                />
              </div>
            </>
          )}

          {/* In the interview stage the top of the page already starts it. */}
          {application.reachedInterviewAt && application.status !== "INTERVIEW" && application.status !== "FINAL_INTERVIEW" && (
            <div id="tool-mock-interview" className="scroll-mt-24">
              <InterviewPrepCard applicationId={application.id} isPro={user.isPro} preview={preview} />
            </div>
          )}

          {(application.reachedAssessmentAt || application.reachedInterviewAt) && (
            <div id="tool-practice-task" className="scroll-mt-24">
              <TechnicalChallengeCard
                applicationId={application.id}
                roleTitle={application.job?.title ?? application.roleTitle}
                isPro={user.isPro}
                preview={preview}
              />
            </div>
          )}

          {followUpShown && (
            <div id="tool-follow-up" className="scroll-mt-24">
              <FollowUpTemplateCard application={application} />
            </div>
          )}

          {prepStage ? (
            <>
              <div id="tool-resume-bullets" className="scroll-mt-24">
                <ResumeTailorCard applicationId={application.id} isPro={user.isPro} preview={preview} />
              </div>
              <div id="tool-application-strategy" className="scroll-mt-24">
                <ApplicationStrategyCard applicationId={application.id} isPro={user.isPro} preview={preview} />
              </div>
            </>
          ) : (
            <Fold title="Resume bullets and cover letter">
              <div className="flex flex-col gap-4">
                <div id="tool-resume-bullets" className="scroll-mt-24">
                  <ResumeTailorCard applicationId={application.id} isPro={user.isPro} preview={preview} />
                </div>
                <div id="tool-application-strategy" className="scroll-mt-24">
                  <ApplicationStrategyCard applicationId={application.id} isPro={user.isPro} preview={preview} />
                </div>
              </div>
            </Fold>
          )}

          <Card>
            <CardHeader>
              <CardTitle>What you sent</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationEditor application={application} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <InterviewsEditor application={application} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactsEditor application={application} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <Milestone label="Applied" at={application.dateApplied} />
              <Milestone label="Assessment" at={application.reachedAssessmentAt} />
              <Milestone label="Interview" at={application.reachedInterviewAt} />
              <Milestone label="Offer" at={application.reachedOfferAt} />
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Outcome</span>
                <Badge variant={application.outcome === "OFFER" ? "success" : application.outcome === "REJECTED" ? "destructive" : "outline"}>
                  {APPLICATION_OUTCOME_LABEL[application.outcome]}
                </Badge>
              </div>
              {application.closedAt && (
                <p className="text-xs text-muted-foreground">
                  Closed {formatDay(application.closedAt)}
                </p>
              )}
              {offeredSalary && (
                <p className="text-sm text-foreground">Offered: {offeredSalary}</p>
              )}
              {job?.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Original posting
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </CardContent>
          </Card>

          {(application.fitScoreAtApply != null || opportunity) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scores when you applied</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Candidate Fit</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {application.fitScoreAtApply ?? "-"}
                  {application.fitScoreAtApply != null && (
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {application.priorityScoreAtApply ?? "-"}
                  {application.priorityScoreAtApply != null && (
                    <span className="text-xs font-normal text-muted-foreground">/100</span>
                  )}
                </span>
              </div>
              {application.fitScoreAtApply == null && (
                <p className="text-xs text-muted-foreground">
                  Added by hand, so there are no scores for this one.
                </p>
              )}
              {opportunity && (
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link href={`/opportunities/${opportunity.id}`}>
                    View full analysis
                    <ExternalLink />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
          )}


        </div>
      </div>
    </div>
  );
}
