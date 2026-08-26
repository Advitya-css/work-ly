import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MapPin,
  Building2,
  Calendar,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { coverageOf, MIN_COVERAGE_FOR_SCORE, roundForDisplay, unassessedIn } from "@/lib/scoring/coverage";
import { ScoreReadout } from "@/components/shared/score-readout";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getJobById } from "@/lib/db/jobs";
import { getJobAnalysisByJobId } from "@/lib/db/job-analyses";
import { formatSalaryRange } from "@/lib/format";
import {
  RECOMMENDATION_LABEL,
  RECOMMENDATION_VARIANT,
  GAP_TYPE_LABEL,
  WORK_MODE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  SENIORITY_LABEL,
  SCORE_COMPONENT_ORDER,
  SCORE_COMPONENT_LABEL,
} from "@/lib/jobs/labels";
import type { ScoreBreakdown } from "@/lib/db/types";

export const metadata: Metadata = { title: "Job Analysis" };

function competitivenessVariant(level: string): "success" | "warning" | "destructive" | "outline" {
  if (level === "High") return "success";
  if (level === "Moderate") return "warning";
  if (level === "Low") return "destructive";
  return "outline";
}

export default async function JobAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const job = await getJobById(user.id, id);
  if (!job || job.userId !== user.id) notFound();

  const jobDetailLine = [job.company, job.location, job.country].filter(Boolean).join(" · ");

  if (job.status === "PARSING") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Analyzing…"
          description="This job posting is still being parsed and scored against your career profile."
        />
        <Alert>
          <Clock />
          <AlertTitle>Still processing</AlertTitle>
          <AlertDescription>
            This can take a few seconds. Refresh the page shortly, or head back to{" "}
            <Link href="/analyze-job" className="underline underline-offset-2">
              Analyze a Job
            </Link>{" "}
            and check back from the recent analyses list.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (job.status === "FAILED") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analysis failed" description="We couldn't parse this job posting." />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {job.errorMessage ?? "The job posting couldn't be parsed. Try pasting the description directly instead."}
          </AlertDescription>
        </Alert>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/analyze-job">
              <ArrowLeft />
              Back to Analyze a Job
            </Link>
          </Button>
          <DeleteJobButton id={job.id} label={job.title ?? "this analysis"} />
        </div>
      </div>
    );
  }

  const analysis = await getJobAnalysisByJobId(job.id);
  if (!analysis) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="No analysis yet" description="This job was parsed but hasn't been scored yet." />
        <Alert>
          <AlertTriangle />
          <AlertDescription>
            Something is inconsistent: the job finished parsing but no fit analysis was saved. Try re-analyzing it.
          </AlertDescription>
        </Alert>
        <DeleteJobButton id={job.id} label={job.title ?? "this analysis"} />
      </div>
    );
  }

  const breakdown = analysis.scoreBreakdown as ScoreBreakdown;
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  // Below this, Workly couldn't reliably assess the role at all - an empty
  // gaps/strengths list here means "nothing to go on," not "clean bill of
  // health," and the copy below must say so rather than implying the latter.
  const lowCoverage = coverageOf(breakdown) < MIN_COVERAGE_FOR_SCORE;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link href="/analyze-job">
            <ArrowLeft />
            Back
          </Link>
        </Button>
        <DeleteJobButton id={job.id} label={job.title ?? "this analysis"} />
      </div>

      <PageHeader title={job.title ?? "Untitled role"} description={jobDetailLine || undefined} />

      {/* Headline: Candidate Fit, Competitiveness, Recommendation */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="px-5 py-6">
            <ScoreReadout
              label="Candidate Fit"
              value={analysis.fitScore}
              coverage={coverageOf(breakdown)}
              unassessed={unassessedIn(breakdown)}
              caption="How well you match this role. Not a hiring guarantee."
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-5 py-6 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Competitiveness</p>
            <Badge variant={competitivenessVariant(analysis.competitiveness)} className="text-sm">
              {analysis.competitiveness}
            </Badge>
            <p className="text-xs text-muted-foreground">Relative to the role&apos;s likely requirements bar.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-5 py-6 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommendation</p>
            <Badge variant={RECOMMENDATION_VARIANT[analysis.recommendation]} className="text-sm">
              {RECOMMENDATION_LABEL[analysis.recommendation]}
            </Badge>
            <p className="text-xs text-muted-foreground">{analysis.recommendationReasoning}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Why you're a match / strengths */}
          <Card>
            <CardHeader>
              <CardTitle>
                Why you&apos;re a match
              </CardTitle>
              <CardDescription>Your strengths for this specific role.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.strengths.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lowCoverage
                    ? "Workly didn't have enough information from your profile and this posting to identify strengths - see the note above."
                    : "No strong matches were found for this role."}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Gaps */}
          <Card>
            <CardHeader>
              <CardTitle>
                Your gaps
              </CardTitle>
              <CardDescription>Where your profile falls short, and why.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lowCoverage
                    ? "Workly didn't have enough information to identify gaps - see the note above."
                    : "No significant gaps identified."}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {analysis.gaps.map((gap, i) => (
                    <li key={i} className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning">{GAP_TYPE_LABEL[gap.type] ?? gap.type}</Badge>
                        <span className="text-sm font-medium text-foreground">{gap.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{gap.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Mandatory requirements */}
          <Card>
            <CardHeader>
              <CardTitle>
                Mandatory requirements
              </CardTitle>
              <CardDescription>What this role requires, and whether your profile shows it.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.mandatoryRequirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mandatory requirements were extracted.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {analysis.mandatoryRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {req.status === "met" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      ) : req.status === "not-met" ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : (
                        /* Unknown is not a failure. A requirement Workly could
                           not verify must never be drawn as a red cross. */
                        <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span>
                        <span className="text-foreground">{req.text}</span>
                        {req.detail && <span className="text-muted-foreground">, {req.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Preferred requirements */}
          <Card>
            <CardHeader>
              <CardTitle>
                Preferred requirements
              </CardTitle>
              <CardDescription>Nice-to-haves: these don&apos;t block a match.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.preferredRequirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No preferred requirements were extracted.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {analysis.preferredRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {req.status === "met" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      ) : req.status === "not-met" ? (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span>
                        <span className="text-foreground">{req.text}</span>
                        {req.detail && <span className="text-muted-foreground">, {req.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Risks */}
          <Card>
            <CardHeader>
              <CardTitle>
                What could hurt your application
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.risks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific risks identified.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {analysis.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card>
            <CardHeader>
              <CardTitle>
                What to improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.improvements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing specific to improve for this role.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {analysis.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {/* Score breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score breakdown</CardTitle>
              <CardDescription>Each component is weighted toward the overall Candidate Fit score.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {SCORE_COMPONENT_ORDER.map((key) => {
                const c = breakdown[key];
                if (!c) return null;
                const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0;
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{SCORE_COMPONENT_LABEL[key]}</span>
                      <span className="text-muted-foreground">
                        {roundForDisplay(c.score)}/{c.maxScore} · {c.weight}% weight
                      </span>
                    </div>
                    <Progress value={pct} label={`${SCORE_COMPONENT_LABEL[key]}: ${roundForDisplay(c.score)} of ${c.maxScore}`} />
                    <p className="text-xs text-muted-foreground">{c.reasoning}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Job details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              {job.company && (
                <p className="flex items-center gap-2 text-foreground">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  {job.company}
                </p>
              )}
              {(job.location || job.country) && (
                <p className="flex items-center gap-2 text-foreground">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  {[job.location, job.country].filter(Boolean).join(", ")}
                </p>
              )}
              {job.deadline && (
                <p className="flex items-center gap-2 text-foreground">
                  <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                  Apply by {new Date(job.deadline).toLocaleDateString()}
                </p>
              )}
              {job.datePosted && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  Posted {new Date(job.datePosted).toLocaleDateString()}
                </p>
              )}

              <Separator className="my-1" />

              <div className="flex flex-wrap gap-1.5">
                {job.workMode && <Badge variant="outline">{WORK_MODE_LABEL[job.workMode]}</Badge>}
                {job.employmentType && <Badge variant="outline">{EMPLOYMENT_TYPE_LABEL[job.employmentType]}</Badge>}
                {job.seniority && <Badge variant="outline">{SENIORITY_LABEL[job.seniority]}</Badge>}
                {job.industry && <Badge variant="secondary">{job.industry}</Badge>}
                {salary && <Badge variant="outline">{salary}</Badge>}
              </div>

              {(job.requiredExperienceYears || job.preferredExperienceYears) && (
                <p className="text-muted-foreground">
                  {job.requiredExperienceYears ? `${job.requiredExperienceYears}+ yrs required` : ""}
                  {job.requiredExperienceYears && job.preferredExperienceYears ? " · " : ""}
                  {job.preferredExperienceYears ? `${job.preferredExperienceYears}+ yrs preferred` : ""}
                </p>
              )}
              {job.education && <p className="text-muted-foreground">Education: {job.education}</p>}

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-primary underline underline-offset-2"
                >
                  <ExternalLink className="size-3.5" />
                  View original posting
                </a>
              )}

              {job.requiredSkills.length > 0 && (
                <>
                  <Separator className="my-1" />
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Required skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
              {job.preferredSkills.length > 0 && (
                <>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Preferred skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.preferredSkills.map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {job.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
