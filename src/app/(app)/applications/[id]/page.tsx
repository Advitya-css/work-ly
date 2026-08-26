import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { formatSalaryRange } from "@/lib/format";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_VARIANT,
  APPLICATION_OUTCOME_LABEL,
} from "@/lib/applications/labels";

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
          {new Date(at).toLocaleDateString()}
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
  const detailLine = [application.company, application.location, application.country]
    .filter(Boolean)
    .join(" · ");
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

      <PageHeader
        title={application.roleTitle}
        description={detailLine || undefined}
        action={
          <Badge variant={APPLICATION_STATUS_VARIANT[application.status]} className="text-sm">
            {APPLICATION_STATUS_LABEL[application.status]}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Application details
              </CardTitle>
              <CardDescription>
                What you sent and when. Recording the CV version is what lets Workly eventually tell
                you which positioning actually works.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationEditor application={application} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Interviews
              </CardTitle>
              <CardDescription>Each round, when it happened, and how it went.</CardDescription>
            </CardHeader>
            <CardContent>
              <InterviewsEditor application={application} />
            </CardContent>
          </Card>

          <ResumeTailorCard applicationId={application.id} />
          
          <ApplicationStrategyCard applicationId={application.id} />

          {application.status === "OFFER" && (
            <SalaryNegotiatorCard applicationId={application.id} />
          )}

          {application.reachedInterviewAt && (
            <div className="flex flex-col gap-4">
              <InterviewPrepCard applicationId={application.id} />
              <TechnicalChallengeCard applicationId={application.id} roleTitle={application.job?.title ?? application.roleTitle} />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Contacts
              </CardTitle>
              <CardDescription>Recruiters, hiring managers, referrals.</CardDescription>
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
              <CardDescription>
                Milestones are recorded permanently. A rejection later doesn&apos;t erase an
                interview you had.
              </CardDescription>
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
                  Closed {new Date(application.closedAt).toLocaleDateString()}
                </p>
              )}
              {offeredSalary && (
                <p className="text-sm text-foreground">Offered: {offeredSalary}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Scores when you applied
              </CardTitle>
              <CardDescription>
                Snapshotted at the time, not recalculated. That&apos;s what makes them comparable
                against the outcome.
              </CardDescription>
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
                  Logged manually, so there are no Workly scores for this one.
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              {application.company && (
                <p className="flex items-center gap-2 text-foreground">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  {application.company}
                </p>
              )}
              {(application.location || application.country) && (
                <p className="flex items-center gap-2 text-foreground">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  {[application.location, application.country].filter(Boolean).join(", ")}
                </p>
              )}
              {application.dateApplied && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0" />
                  Applied {new Date(application.dateApplied).toLocaleDateString()}
                </p>
              )}
              {application.industry && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{application.industry}</Badge>
                </div>
              )}
              {job?.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-primary underline underline-offset-2"
                >
                  <ExternalLink className="size-3.5" />
                  Original posting
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
