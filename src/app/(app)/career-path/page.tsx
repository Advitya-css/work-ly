import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  Flag,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { PathwayStepCard } from "@/components/pathway/pathway-step-card";
import { ActionCard } from "@/components/pathway/action-card";
import { GeneratePathwayButton } from "@/components/pathway/generate-pathway-button";
import { SharePathwayButton } from "@/components/pathway/share-pathway-button";
import { PathwayCheckIn } from "@/components/pathway/pathway-check-in";
import { WhatIfPanel } from "@/components/pathway/what-if-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayJobTitle } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getActiveFullPathway, computeProgress, nextUpFor } from "@/lib/pathway/get-full-pathway";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { exploreCareers } from "@/lib/pathway/explore-careers";
import { ACTION_WINDOW_ORDER, ACTION_WINDOW_LABEL, ACTION_WINDOW_CAPTION } from "@/lib/pathway/labels";

export const metadata: Metadata = { title: "Action Plan" };
// Pathway generation and step completion re-run the screen.
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

export default async function CareerPathPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [pathway, profile, careerGoal, opportunities] = await Promise.all([
    getActiveFullPathway(user.id),
    getFullCareerProfile(user.id),
    getPrimaryCareerGoal(user.id),
    listOpportunitiesWithJobByUserId(user.id),
  ]);

  const adjacentCareers = exploreCareers({
    profile,
    careerGoal,
    opportunities,
    currentTarget: pathway?.targetStateLabel ?? null,
  });

  if (!pathway) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Action plan" description="A week-by-week plan from where you are to the role you want." />

        <SectionTabs section="career" />
        <section className="flex flex-col items-start gap-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex max-w-xl flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">Build your action plan</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Work-ly turns the gaps between your profile and your target role into ordered steps. It works best after a dream-job check.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <GeneratePathwayButton hasExisting={false} isPro={user.isPro} />
            <Button asChild variant="ghost">
              <Link href="/dream-job">Check a dream job first</Link>
            </Button>
          </div>
        </section>

        {adjacentCareers.length > 0 && <CareerExplorer careers={adjacentCareers} />}
      </div>
    );
  }

  const progress = computeProgress(pathway);

  // Ask about what's actually next: the same step the dashboard names. The
  // first PENDING action alone could belong to a step already marked done.
  const firstPendingAction = (() => {
    const next = nextUpFor(pathway);
    return next ? { title: next.label } : null;
  })();

  return (
    <div className="flex flex-col gap-6">
      <PathwayCheckIn pendingActionTitle={firstPendingAction?.title} />
      <PageHeader
        title="Action plan"
        description="Your steps from where you are to the role you want, in order."
        action={
          <div className="flex items-center gap-2">
            <SharePathwayButton pathwayId={pathway.id} />
            <GeneratePathwayButton hasExisting isPro={user.isPro} />
          </div>
        }
      />

      <SectionTabs section="career" />

      {/* Progress summary */}
      <Card>
        <CardContent className="flex flex-col gap-3 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{pathway.currentStateLabel}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <Flag className="size-4 text-primary" />
              <span className="font-medium text-primary">{pathway.targetStateLabel}</span>
            </div>
            <span className="text-sm font-medium tabular-nums text-foreground">
              {progress.completed} / {progress.total} completed
              {progress.skipped > 0 && (
                <span className="font-normal text-muted-foreground"> · {progress.skipped} skipped</span>
              )}
            </span>
          </div>
          <Progress value={progress.percent} label="Career pathway progress" />
          <p className="text-xs text-muted-foreground">
            Readiness after your last completed step: {pathway.startingReadiness}/100 Candidate Fit. It is re-checked each time you
            complete a step, and moves most when you add the project or result to your profile. That number
            is a fit score, never a hiring probability.
          </p>
        </CardContent>
      </Card>

      {/* The pathway itself */}
      <Card>
        <CardHeader>
          <CardTitle>
            Your pathway
          </CardTitle>
          <CardDescription>
            Ordered so you can actually start. Quick, unblocking work first, longer-running work later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* CURRENT marker */}
          <div className="mb-2 flex items-center gap-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
              <MapPin className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current</p>
              <p className="text-sm font-medium text-foreground">{pathway.currentStateLabel}</p>
            </div>
          </div>
          <div className="relative ml-4 h-6 w-px bg-border overflow-hidden" aria-hidden><div className="absolute left-0 w-full h-full bg-gradient-to-b from-transparent via-primary to-transparent animate-circuit" /></div>

          {pathway.steps.map((step, index) => (
            <PathwayStepCard key={step.id} step={step} isLast={index === pathway.steps.length - 1} actions={pathway.actions.filter((a: any) => a.stepId === step.id)} />
          ))}

          {/* TARGET marker */}
          <div className="flex items-center gap-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Flag className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target</p>
              <p className="text-sm font-medium text-primary">{pathway.targetStateLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 30/60/90 plan */}
      <Card>
        <CardHeader>
          <CardTitle>
            Your 30/60/90 Action Plan
          </CardTitle>
          <CardDescription>
            Concrete actions, time-boxed. Each one says what it costs you and what it&apos;s worth.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {ACTION_WINDOW_ORDER.map((window) => {
            const windowActions = pathway.actions.filter((a) => a.window === window);
            if (windowActions.length === 0) return null;
            const done = windowActions.filter((a) => a.status !== "PENDING").length;
            return (
              <div key={window} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{ACTION_WINDOW_LABEL[window]}</h3>
                    <p className="text-xs text-muted-foreground">{ACTION_WINDOW_CAPTION[window]}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {done} / {windowActions.length} done
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {windowActions.map((action) => (
                    <ActionCard key={action.id} action={action} />
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* What-if: only meaningful against an analyzed target */}
      {pathway.dreamJobId && <WhatIfPanel dreamJobId={pathway.dreamJobId} />}

      {adjacentCareers.length > 0 && <CareerExplorer careers={adjacentCareers} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CareerExplorer({
  careers,
}: {
  careers: ReturnType<typeof exploreCareers>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Roles you could move into</h2>
          <p className="text-sm text-muted-foreground">Based on your skills. Analyze a real posting to measure your fit.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/analyze-job">
            Measure a role properly
            <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {careers.map((career) => (
          <article key={career.role} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">{displayJobTitle(career.role)}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">{career.whyItFits}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                {career.isMeasured ? (
                  <span
                    className={cn(
                      "text-2xl font-semibold leading-none tabular-nums",
                      career.currentFit >= 75 ? "text-success" : career.currentFit >= 50 ? "text-warning" : "text-muted-foreground",
                    )}
                  >
                    {career.currentFit}
                  </span>
                ) : (
                  // Without a real posting, the honest number is skill overlap, not a fit score.
                  <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
                    {career.matchedSkills.length}/{career.requiredSkills.length}
                  </span>
                )}
                <span className="mt-1 text-[11px] text-muted-foreground">{career.isMeasured ? "fit, measured" : "core skills"}</span>
              </div>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {career.requiredSkills.slice(0, 5).map((skill) => {
                const has = career.matchedSkills.includes(skill);
                return (
                  <li
                    key={skill}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2.5 py-0.5 text-xs",
                      has ? "border-success/30 bg-success/10 text-success" : "border-border text-muted-foreground",
                    )}
                  >
                    {has && <CheckCircle2 className="size-3 shrink-0" />}
                    <span className="truncate">{skill}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
              <span className="font-medium text-foreground/80">Usual way in:</span> {career.typicalEntryRoute}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
