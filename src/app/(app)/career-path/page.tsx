import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  Flag,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconPathway } from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { IllustrationPathway } from "@/components/shared/empty-illustration";
import { PathwayStepCard } from "@/components/pathway/pathway-step-card";
import { ActionCard } from "@/components/pathway/action-card";
import { GeneratePathwayButton } from "@/components/pathway/generate-pathway-button";
import { WhatIfPanel } from "@/components/pathway/what-if-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getActiveFullPathway, computeProgress } from "@/lib/pathway/get-full-pathway";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { listOpportunitiesWithJobByUserId } from "@/lib/opportunities/get-with-job";
import { exploreCareers } from "@/lib/pathway/explore-careers";
import { ACTION_WINDOW_ORDER, ACTION_WINDOW_LABEL, ACTION_WINDOW_CAPTION } from "@/lib/pathway/labels";

export const metadata: Metadata = { title: "Action Plan" };

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
        <PageHeader
          title="Action Plan"
          description="A specific, premium 30/60/90 day curriculum to close your skill gaps."
        />

        <SectionTabs section="career" />
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            illustration={IllustrationPathway}
            title="No pathway yet"
            description="Workly builds your pathway from the gaps between your profile and your target role. Analyze a dream job first, then generate a pathway here."
            action={{ label: "Analyze your dream job", href: "/dream-job" }}
            className="w-full"
          />
          <GeneratePathwayButton hasExisting={false} />
        </div>

        {adjacentCareers.length > 0 && <CareerExplorer careers={adjacentCareers} />}
      </div>
    );
  }

  const progress = computeProgress(pathway);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Career Path"
        description="A practical, ordered pathway from where you are now to where you want to be."
        action={<GeneratePathwayButton hasExisting />}
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
            Readiness when this pathway was generated: {pathway.startingReadiness}/100 Candidate Fit.
            Regenerate after completing steps to see it move. That number is a fit score, never a
            hiring probability.
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
          <div className="ml-4 h-6 w-px bg-border" aria-hidden />

          {pathway.steps.map((step, index) => (
            <PathwayStepCard key={step.id} step={step} isLast={index === pathway.steps.length - 1} />
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
    <Card>
      <CardHeader>
        <CardTitle>
          Career explorer
        </CardTitle>
        <CardDescription>
          Adjacent roles worth a look. Where a fit is marked measured, it came from a real posting you
          analyzed: otherwise it&apos;s indicative, based on skill overlap.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {careers.map((career) => (
          <div key={career.role} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{career.role}</p>
              <Badge variant={career.isMeasured ? "success" : "outline"}>
                {career.currentFit}/100 {career.isMeasured ? "measured" : "indicative"}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{career.whyItFits}</p>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Typical skills
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {career.requiredSkills.map((skill) => {
                  const has = career.matchedSkills.includes(skill);
                  return (
                    <Badge key={skill} variant={has ? "success" : "outline"}>
                      {has && <CheckCircle2 className="size-3" />}
                      {skill}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Typical entry route:</span>{" "}
              {career.typicalEntryRoute}
            </p>

            {career.relevantJobCount > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" />
                {career.relevantJobCount} matching {career.relevantJobCount === 1 ? "opportunity" : "opportunities"} in your pipeline
              </p>
            )}
          </div>
        ))}
      </CardContent>
      <CardContent className="pt-0">
        <Button asChild variant="outline" size="sm">
          <Link href="/analyze-job">
            Analyze a role to measure your fit properly
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
