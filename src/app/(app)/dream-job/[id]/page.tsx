import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Building2,
  Rocket,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DeleteDreamJobButton } from "@/components/dream-job/delete-dream-job-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDreamJobWithAnalysisById } from "@/lib/dream-job/get-with-analysis";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { skillsMatch } from "@/lib/scoring/shared";
import { coverageOf, MIN_COVERAGE_FOR_SCORE, roundForDisplay, unassessedIn } from "@/lib/scoring/coverage";
import { ScoreReadout } from "@/components/shared/score-readout";
import { formatSalaryRange } from "@/lib/format";
import {
  GAP_TYPE_LABEL,
  WORK_MODE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  SENIORITY_LABEL,
  SCORE_COMPONENT_ORDER,
  SCORE_COMPONENT_LABEL,
  COMPETITIVENESS_VARIANT,
} from "@/lib/jobs/labels";
import {
  GAP_IMPACT_VARIANT,
  GAP_IMPACT_LABEL,
  GAP_DIFFICULTY_LABEL,
  IMPROVEMENT_TIER_LABEL,
  IMPROVEMENT_TIER_VARIANT,
  CV_IMPROVEMENT_AREA_LABEL,
} from "@/lib/dream-job/labels";

export const metadata: Metadata = { title: "Dream Job Analysis" };

function readinessCopy(score: number): string {
  if (score >= 75) return "You're closer than you think. This is within reach with a few targeted moves.";
  if (score >= 50) return "You are closer than you think.";
  if (score >= 25) return "There's real ground to cover, but the path here is concrete, not vague.";
  return "This is a long-range goal today. The gaps below are what stand between here and there.";
}

export default async function DreamJobAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dreamJob = await getDreamJobWithAnalysisById(id);
  if (!dreamJob || dreamJob.userId !== user.id) notFound();

  const jobDetailLine = [dreamJob.company, dreamJob.location, dreamJob.country].filter(Boolean).join(" · ");

  if (dreamJob.status === "PARSING") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analyzing…" description="This dream job is still being parsed and compared against your career profile." />
        <Alert>
          <Clock />
          <AlertTitle>Still processing</AlertTitle>
          <AlertDescription>
            This can take a few seconds. Refresh the page shortly, or head back to{" "}
            <Link href="/dream-job" className="underline underline-offset-2">
              Dream Job
            </Link>{" "}
            and check back from the past analyses list.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (dreamJob.status === "FAILED") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Analysis failed" description="We couldn't parse this job description." />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {dreamJob.errorMessage ?? "The description couldn't be parsed. Try pasting it again with more detail."}
          </AlertDescription>
        </Alert>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dream-job">
              <ArrowLeft />
              Back to Dream Job
            </Link>
          </Button>
          <DeleteDreamJobButton id={dreamJob.id} label={dreamJob.title ?? dreamJob.dreamRole} />
        </div>
      </div>
    );
  }

  const analysis = dreamJob.analysis;
  if (!analysis) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="No analysis yet" description="This dream job was parsed but hasn't been analyzed yet." />
        <Alert>
          <AlertTriangle />
          <AlertDescription>
            Something is inconsistent: parsing finished but no analysis was saved. Try re-submitting it.
          </AlertDescription>
        </Alert>
        <DeleteDreamJobButton id={dreamJob.id} label={dreamJob.title ?? dreamJob.dreamRole} />
      </div>
    );
  }

  const profile = await getFullCareerProfile(user.id);
  const confirmedSkills = profile.skills.filter((s) => !s.isTransferable);
  const alreadyHave = Array.from(
    new Set(
      [...dreamJob.requiredSkills, ...dreamJob.preferredSkills].filter((name) =>
        confirmedSkills.some((s) => skillsMatch(s.name, name)),
      ),
    ),
  );

  const salary = formatSalaryRange(dreamJob.salaryMin, dreamJob.salaryMax, dreamJob.salaryCurrency);
  const topGaps = analysis.gapPriorities.slice(0, 5);
  // Below this, Workly couldn't reliably assess the role at all - an empty
  // gaps list here means "nothing to go on," not "you're a perfect match,"
  // and the copy below must say so rather than implying the latter.
  const lowCoverage = coverageOf(analysis.scoreBreakdown) < MIN_COVERAGE_FOR_SCORE;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground">
          <Link href="/dream-job">
            <ArrowLeft />
            Back to Dream Job
          </Link>
        </Button>
        <DeleteDreamJobButton id={dreamJob.id} label={dreamJob.title ?? dreamJob.dreamRole} />
      </div>

      <PageHeader title={dreamJob.title ?? dreamJob.dreamRole} description={jobDetailLine || undefined} />

      {/* Hero: Current Readiness */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <ScoreReadout
            label="Current Readiness"
            value={analysis.readinessScore}
            coverage={coverageOf(analysis.scoreBreakdown)}
            unassessed={unassessedIn(analysis.scoreBreakdown)}
            caption={readinessCopy(analysis.readinessScore)}
          />
          <p className="text-xs text-muted-foreground">
            This is your Candidate Fit for this role. Not a hiring probability. Workly never estimates your odds of
            being hired.
          </p>
          <Badge variant={COMPETITIVENESS_VARIANT[analysis.competitiveness]} className="mt-1">
            {analysis.competitiveness} competitiveness
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* You already have */}
        <Card>
          <CardHeader>
            <CardTitle>
              You already have
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alreadyHave.length === 0 && analysis.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing clearly matched yet. See the gaps below.</p>
            ) : alreadyHave.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {alreadyHave.map((s) => (
                  <Badge key={s} variant="success">
                    <CheckCircle2 className="size-3" />
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {analysis.strengths.slice(0, 4).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Biggest gaps */}
        <Card>
          <CardHeader>
            <CardTitle>
              Biggest gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {lowCoverage
                  ? "Workly didn't have enough information to prioritize gaps - see Current Readiness above."
                  : "No significant gaps identified."}
              </p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {topGaps.map((gap, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span>{gap.title}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Highest impact next step */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Rocket className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Highest impact next step
              </p>
              <p className="text-sm font-medium text-foreground">{analysis.highestImpactNextStep}</p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <a href="#improvement-plan">Build My Pathway</a>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Gap classification */}
          <Card>
            <CardHeader>
              <CardTitle>
                Gap classification
              </CardTitle>
              <CardDescription>Every gap, classified by type. Never a flat list of missing skills.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lowCoverage
                    ? "Workly didn't have enough information to classify gaps - see Current Readiness above."
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

          {/* Gap prioritization */}
          <Card id="gap-priorities">
            <CardHeader>
              <CardTitle>
                Gap prioritization
              </CardTitle>
              <CardDescription>
                Ranked by impact, difficulty, time required, and how many of your tracked opportunities it would also
                help.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.gapPriorities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lowCoverage
                    ? "Workly didn't have enough information to prioritize gaps - see Current Readiness above."
                    : "No significant gaps identified."}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {analysis.gapPriorities.map((gap, i) => (
                    <li key={i} className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={GAP_IMPACT_VARIANT[gap.impact]}>{GAP_IMPACT_LABEL[gap.impact]}</Badge>
                        <Badge variant="outline">{GAP_DIFFICULTY_LABEL[gap.difficulty]}</Badge>
                        <span className="text-sm font-medium text-foreground">{gap.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{gap.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Estimated effort: {gap.estimatedTime}
                        {gap.affectedOpportunityCount > 0 &&
                          ` · Could unlock: ${gap.affectedOpportunityCount} opportunit${gap.affectedOpportunityCount === 1 ? "y" : "ies"}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* CV improvements */}
          <Card>
            <CardHeader>
              <CardTitle>
                CV improvements
              </CardTitle>
              <CardDescription>
                Never fabricated: every suggestion compares your actual profile text against this role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.cvImprovements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing specific to improve for this role.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {analysis.cvImprovements.map((imp, i) => (
                    <li key={i} className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{CV_IMPROVEMENT_AREA_LABEL[imp.area] ?? imp.area}</Badge>
                      </div>
                      <p className="text-sm text-foreground">{imp.issue}</p>
                      <p className="text-sm text-muted-foreground">{imp.suggestion}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* What not to change */}
          <Card>
            <CardHeader>
              <CardTitle>
                What not to change
              </CardTitle>
              <CardDescription>The strong parts: don&apos;t dilute these while you work on the gaps.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.keepAsIs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing specifically flagged yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {analysis.keepAsIs.map((k, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>
                        <span className="font-medium">{k.title}.</span> <span className="text-muted-foreground">{k.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Improvement plan */}
          <Card id="improvement-plan">
            <CardHeader>
              <CardTitle>
                Improvement plan
              </CardTitle>
              <CardDescription>Highest-impact changes first: why, impact, effort, and which jobs it helps.</CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.improvementPlan.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing specific to plan for yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {analysis.improvementPlan.map((item, i) => (
                    <li key={i} className="flex flex-col gap-1 rounded-lg border border-border px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={IMPROVEMENT_TIER_VARIANT[item.tier]}>{IMPROVEMENT_TIER_LABEL[item.tier]}</Badge>
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.why}</p>
                      <p className="text-xs text-muted-foreground">Impact: {item.impact}</p>
                      <p className="text-xs text-muted-foreground">Effort: {item.effort}</p>
                      {item.relevantJobs.length > 0 && (
                        <p className="text-xs text-muted-foreground">Relevant jobs: {item.relevantJobs.join(", ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Project recommendations */}
          {analysis.projectRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Project recommendations
                </CardTitle>
                <CardDescription>A project can close a gap faster than waiting for it to happen on the job.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {analysis.projectRecommendations.map((proj, i) => (
                  <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{proj.project}</span>
                      <Badge variant="outline">{GAP_DIFFICULTY_LABEL[proj.difficulty]}</Badge>
                      <Badge variant="outline">{proj.estimatedTime}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{proj.why}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {proj.skillsDemonstrated.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Deliverables</p>
                    <ul className="flex flex-col gap-1">
                      {proj.deliverables.map((d, di) => (
                        <li key={di} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">{proj.portfolioPresentation}</p>
                    {proj.relevantTargetJobs.length > 0 && (
                      <p className="text-xs text-muted-foreground">Also relevant to: {proj.relevantTargetJobs.join(", ")}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Readiness breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Readiness breakdown</CardTitle>
              <CardDescription>The same Candidate Fit calculation used everywhere else, relabeled for a dream role.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {SCORE_COMPONENT_ORDER.map((key) => {
                const c = analysis.scoreBreakdown[key];
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

          {/* Biggest obstacles */}
          {analysis.biggestObstacles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Biggest obstacles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {analysis.biggestObstacles.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Dream job details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target role details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 text-sm">
              {dreamJob.company && (
                <p className="flex items-center gap-2 text-foreground">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  {dreamJob.company}
                </p>
              )}
              {(dreamJob.location || dreamJob.country) && (
                <p className="flex items-center gap-2 text-foreground">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  {[dreamJob.location, dreamJob.country].filter(Boolean).join(", ")}
                </p>
              )}

              <Separator className="my-1" />

              <div className="flex flex-wrap gap-1.5">
                {dreamJob.workMode && <Badge variant="outline">{WORK_MODE_LABEL[dreamJob.workMode]}</Badge>}
                {dreamJob.employmentType && <Badge variant="outline">{EMPLOYMENT_TYPE_LABEL[dreamJob.employmentType]}</Badge>}
                {dreamJob.seniority && <Badge variant="outline">{SENIORITY_LABEL[dreamJob.seniority]}</Badge>}
                {dreamJob.industry && <Badge variant="secondary">{dreamJob.industry}</Badge>}
                {salary && <Badge variant="outline">{salary}</Badge>}
              </div>

              {(dreamJob.requiredExperienceYears || dreamJob.preferredExperienceYears) && (
                <p className="text-muted-foreground">
                  {dreamJob.requiredExperienceYears ? `${dreamJob.requiredExperienceYears}+ yrs required` : ""}
                  {dreamJob.requiredExperienceYears && dreamJob.preferredExperienceYears ? " · " : ""}
                  {dreamJob.preferredExperienceYears ? `${dreamJob.preferredExperienceYears}+ yrs preferred` : ""}
                </p>
              )}
              {dreamJob.education && <p className="text-muted-foreground">Education: {dreamJob.education}</p>}
              {dreamJob.portfolio && (
                <a
                  href={dreamJob.portfolio}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline underline-offset-2"
                >
                  View portfolio
                </a>
              )}

              {dreamJob.requiredSkills.length > 0 && (
                <>
                  <Separator className="my-1" />
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dreamJob.requiredSkills.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
              {dreamJob.preferredSkills.length > 0 && (
                <>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferred skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dreamJob.preferredSkills.map((s) => (
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
          {dreamJob.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{dreamJob.description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
