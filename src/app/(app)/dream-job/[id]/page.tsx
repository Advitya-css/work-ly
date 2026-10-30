import type { Metadata } from "next";
import { placeLine } from "@/lib/places";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DeleteDreamJobButton } from "@/components/dream-job/delete-dream-job-button";
import { BuildPathwayFromDreamJobButton } from "@/components/pathway/build-pathway-from-dream-job-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDreamJobWithAnalysisById } from "@/lib/dream-job/get-with-analysis";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { skillsMatch } from "@/lib/scoring/shared";
import { coverageOf, MIN_COVERAGE_FOR_SCORE, roundForDisplay } from "@/lib/scoring/coverage";
import { ScoreRing } from "@/components/opportunities/analysis/score-ring";
import { Fold, Panel } from "@/components/shared/fold";
import { formatSalaryRange } from "@/lib/format";
import {
  WORK_MODE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  SENIORITY_LABEL,
  SCORE_COMPONENT_ORDER,
  SCORE_COMPONENT_LABEL,
} from "@/lib/jobs/labels";
import {
  GAP_IMPACT_VARIANT,
  GAP_IMPACT_LABEL,
  GAP_DIFFICULTY_LABEL,
  IMPROVEMENT_TIER_LABEL,
  CV_IMPROVEMENT_AREA_LABEL,
} from "@/lib/dream-job/labels";

export const metadata: Metadata = { title: "Dream Job Analysis" };
// Re-analysis and "Build my pathway" run the grounded screen and the plan model.
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

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

  const jobDetailLine = [dreamJob.company, placeLine(dreamJob.location, dreamJob.country, " · ")].filter(Boolean).join(" · ");

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
  // A skill named in one of the biggest gaps isn't something you "already
  // have" for this role (Airflow on your skills list, but the role wants
  // proven orchestration) - showing it on both sides reads as a contradiction.
  const gapText = analysis.gapPriorities.slice(0, 5).map((g) => g.title.toLowerCase()).join(" | ");
  const alreadyHave = Array.from(
    new Set(
      [...dreamJob.requiredSkills, ...dreamJob.preferredSkills].filter(
        (name) => confirmedSkills.some((s) => skillsMatch(s.name, name)) && !gapText.includes(name.toLowerCase()),
      ),
    ),
  );

  const salary = formatSalaryRange(dreamJob.salaryMin, dreamJob.salaryMax, dreamJob.salaryCurrency);
  const topGaps = analysis.gapPriorities.slice(0, 5);
  // Below this, Work-ly couldn't reliably assess the role at all - an empty
  // gaps list here means "nothing to go on," not "you're a perfect match,"
  // and the copy below must say so rather than implying the latter.
  const lowCoverage = coverageOf(analysis.scoreBreakdown) < MIN_COVERAGE_FOR_SCORE;
  // Week-by-week plan blocks (newer analyses); older analyses have none and
  // fall back to the plain improvement list below.
  const planBlocks = analysis.improvementPlan.filter((item) => item.block);
  const otherPlanItems = analysis.improvementPlan.filter((item) => !item.block);
  const projectedReadiness = planBlocks.length > 0 ? planBlocks[planBlocks.length - 1].block!.readinessAfter : null;

  const totalWeeks = planBlocks.length > 0 ? planBlocks[planBlocks.length - 1].block!.endWeek : 0;
  const editItems = [
    ...analysis.cvImprovements.map((imp) => ({ title: imp.issue, detail: imp.suggestion, tag: CV_IMPROVEMENT_AREA_LABEL[imp.area] ?? imp.area })),
    ...otherPlanItems.map((item) => ({ title: item.title, detail: item.why, tag: IMPROVEMENT_TIER_LABEL[item.tier] })),
  ];
  const reliable = !lowCoverage;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/dream-job">
            <ArrowLeft />
            Dream jobs
          </Link>
        </Button>
        <DeleteDreamJobButton id={dreamJob.id} label={dreamJob.title ?? dreamJob.dreamRole} />
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">{dreamJob.dreamRole || dreamJob.title}</h1>
        {(jobDetailLine || salary) && (
          <p className="text-sm text-muted-foreground">{[jobDetailLine, salary].filter(Boolean).join(" · ")}</p>
        )}
      </header>

      {/* Readiness: where you are, where the plan takes you, one button. */}
      <section className="grid gap-6 feature-panel p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        <ScoreRing value={reliable ? analysis.readinessScore : null} />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Readiness on {new Date(analysis.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          <p className="text-2xl font-semibold leading-tight tracking-tight text-balance text-foreground">
            {reliable && projectedReadiness != null && projectedReadiness > analysis.readinessScore
              ? `About ${projectedReadiness} after a ${totalWeeks}-week plan`
              : readinessCopy(analysis.readinessScore)}
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">
            {reliable
              ? "Measured the same way as every job fit in Work-ly. It isn't a hiring probability."
              : `Not enough to score this fairly yet (Work-ly could check ${Math.round(coverageOf(analysis.scoreBreakdown) * 100)}% of it). Add more to your profile.`}
          </p>
        </div>
        <div className="md:justify-self-end">
          <BuildPathwayFromDreamJobButton dreamJobId={id} isPro={user.isPro} gaps={topGaps.map((g) => g.title)} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="You already have">
          {alreadyHave.length === 0 && analysis.strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing clearly matched yet.</p>
          ) : alreadyHave.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {alreadyHave.map((s) => (
                <li key={s} className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-sm text-success">
                  <CheckCircle2 className="size-3.5" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2">
              {analysis.strengths.slice(0, 4).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Biggest gaps">
          {topGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{lowCoverage ? "Not enough information to rank gaps." : "No significant gaps."}</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {topGaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span>{gap.title}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {planBlocks.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="plan-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="plan-title" className="text-lg font-semibold text-foreground">
              Your {totalWeeks}-week plan
            </h2>
            <p className="text-xs text-muted-foreground">About {planBlocks[0].block!.hoursPerWeek} hours a week</p>
          </div>
          {analysis.highestImpactNextStep && (
            <p className="rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm text-foreground">
              <span className="font-semibold text-primary">Start today: </span>
              {analysis.highestImpactNextStep.replace(/^Today:\s*/i, "").split(/\.\s+Then/)[0]}
            </p>
          )}
          <ol className="flex flex-col gap-2">
            {planBlocks.map((item, i) => {
              const block = item.block!;
              const previous = i === 0 ? analysis.readinessScore : planBlocks[i - 1].block!.readinessAfter;
              // Plans made before heldBackBy existed don't have it: for those, a
              // block that closes gaps but doesn't move the number is the cap.
              const unchanged =
                block.readinessAfter != null &&
                previous != null &&
                block.readinessAfter <= previous &&
                ((block.heldBackBy?.length ?? 0) > 0 || (block.heldBackBy === undefined && block.closes.length > 0));
              const weeks = block.startWeek === block.endWeek ? `Week ${block.startWeek}` : `Weeks ${block.startWeek}–${block.endWeek}`;
              return (
                <li key={i}>
                  <details open={i === 0} className="group rounded-xl border border-border bg-card shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{weeks}</span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{block.focus}</span>
                      {block.readinessAfter != null && (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          → <span className="font-semibold text-foreground">{block.readinessAfter}</span>
                        </span>
                      )}
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:px-5 sm:pl-[8.25rem]">
                      <ul className="flex flex-col gap-2">
                        {block.actions.map((action, ai) => (
                          <li key={ai} className="flex items-start gap-2.5 text-sm text-foreground">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                      <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-[6rem_1fr]">
                        <dt className="font-medium text-foreground/80">You&apos;ll have</dt>
                        <dd>{block.deliverable}</dd>
                        <dt className="font-medium text-foreground/80">Done when</dt>
                        <dd>{block.doneWhen}</dd>
                        {block.resource && (
                          <>
                            <dt className="font-medium text-foreground/80">Resource</dt>
                            <dd>{block.resource}</dd>
                          </>
                        )}
                      </dl>
                      {unchanged && (
                        <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                          {block.heldBackBy?.length
                            ? `Readiness stays capped until these must-haves are covered: ${block.heldBackBy.join("; ")}. This block still counts.`
                            : "Readiness stays capped until a must-have is covered. This block still counts."}
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.gapPriorities.length > 0 && (
          <Fold title="Every gap, ranked" hint={`${analysis.gapPriorities.length}`}>
            <ul className="flex flex-col divide-y divide-border">
              {analysis.gapPriorities.map((gap, i) => (
                <li key={i} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{gap.title}</span>
                    <Badge variant={GAP_IMPACT_VARIANT[gap.impact]}>{GAP_IMPACT_LABEL[gap.impact]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {GAP_DIFFICULTY_LABEL[gap.difficulty]} · {gap.estimatedTime}
                    {gap.affectedOpportunityCount > 0 &&
                      ` · helps ${gap.affectedOpportunityCount} tracked job${gap.affectedOpportunityCount === 1 ? "" : "s"}`}
                  </p>
                </li>
              ))}
            </ul>
          </Fold>
        )}

        {editItems.length > 0 && (
          <Fold title="Edits to your CV" hint={`${editItems.length}`}>
            <ul className="flex flex-col divide-y divide-border">
              {editItems.map((e, i) => (
                <li key={i} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-foreground">{e.title}</span>
                  <span className="text-xs text-muted-foreground">{e.detail}</span>
                </li>
              ))}
            </ul>
          </Fold>
        )}

        {analysis.projectRecommendations.length > 0 && (
          <Fold title="Projects that would close gaps" hint={`${analysis.projectRecommendations.length}`}>
            <ul className="flex flex-col divide-y divide-border">
              {analysis.projectRecommendations.map((proj, i) => (
                <li key={i} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-foreground">{proj.project}</span>
                  <span className="text-xs text-muted-foreground">
                    {GAP_DIFFICULTY_LABEL[proj.difficulty]} · {proj.estimatedTime}
                  </span>
                  <p className="text-sm text-muted-foreground">{proj.why}</p>
                  {proj.skillsDemonstrated.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {proj.skillsDemonstrated.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Fold>
        )}

        {analysis.keepAsIs.length > 0 && (
          <Fold title="Keep as it is" hint={`${analysis.keepAsIs.length}`}>
            <ul className="flex flex-col gap-2.5">
              {analysis.keepAsIs.map((k, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>
                    <span className="font-medium">{k.title}.</span> <span className="text-muted-foreground">{k.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Fold>
        )}

        <Fold title="How readiness is worked out">
          <div className="flex flex-col gap-4">
            {SCORE_COMPONENT_ORDER.map((key) => {
              const c = analysis.scoreBreakdown[key];
              if (!c) return null;
              const unscored = "confidence" in c && c.confidence === "unavailable";
              const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-foreground">{SCORE_COMPONENT_LABEL[key]}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {unscored ? "Not scored" : `${roundForDisplay(c.score)} / ${c.maxScore}`}
                    </span>
                  </div>
                  {!unscored && <Progress value={pct} label={`${SCORE_COMPONENT_LABEL[key]}: ${roundForDisplay(c.score)} of ${c.maxScore}`} />}
                  <p className="text-xs text-muted-foreground">{c.reasoning}</p>
                </div>
              );
            })}
          </div>
        </Fold>

        <Fold title="About the role">
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {dreamJob.workMode && <Badge variant="outline">{WORK_MODE_LABEL[dreamJob.workMode]}</Badge>}
              {dreamJob.employmentType && <Badge variant="outline">{EMPLOYMENT_TYPE_LABEL[dreamJob.employmentType]}</Badge>}
              {dreamJob.seniority && <Badge variant="outline">{SENIORITY_LABEL[dreamJob.seniority]}</Badge>}
              {dreamJob.industry && <Badge variant="secondary">{dreamJob.industry}</Badge>}
              {dreamJob.requiredExperienceYears ? <Badge variant="outline">{dreamJob.requiredExperienceYears}+ years</Badge> : null}
            </div>
            {dreamJob.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{dreamJob.description}</p>}
          </div>
        </Fold>
      </div>
    </div>
  );
}
