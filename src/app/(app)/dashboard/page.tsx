import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  IconApplication,
  IconDashboard,
  IconGoal,
  IconOpportunity,
} from "@/components/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { EnterStudentModeButton } from "@/components/student/student-mode-buttons";
import { GettingStartedCard } from "@/components/dashboard/getting-started-card";
import { StaleApplicationsCard } from "@/components/dashboard/stale-applications-card";
import { ProfileCompletenessCard } from "@/components/dashboard/profile-completeness-card";
import { PathwayProgressCard } from "@/components/dashboard/pathway-progress-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listCareerGoalsByUserId } from "@/lib/db/career-goals";
import { listOpportunitiesByUserId } from "@/lib/db/opportunities";
import { listApplicationsByUserId } from "@/lib/db/applications";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { calculateProfileCompleteness } from "@/lib/career/completeness";
import { getActiveFullPathway } from "@/lib/pathway/get-full-pathway";
import { summarize } from "@/lib/applications/analytics";
import { matchesLocationPreference } from "@/lib/jobs/location-match";
import { listDiscoveredJobsByUserId, getLatestRun } from "@/lib/db/discovery";
import { bucketJobs } from "@/lib/discovery/run";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { getJobById } from "@/lib/db/jobs";
import { nextUpFor } from "@/lib/pathway/get-full-pathway";
import { listMoves } from "@/lib/guidance/next-move";
import { buildBriefing } from "@/lib/guidance/briefing";
import { PAID_PLANS } from "@/lib/pricing";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { CommandCenter } from "@/components/dashboard/command-center";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Checkouts started before the success URL moved to Settings still land
  // here; send them on so the purchase is confirmed.
  const params = await searchParams;
  if (params.success === "true" || typeof params.checkout_id === "string") {
    const id = typeof params.checkout_id === "string" ? params.checkout_id : null;
    redirect(id ? `/settings?checkout_id=${encodeURIComponent(id)}` : "/settings?restore=1");
  }

  const user = await getCurrentUser();
  const [profile, goals, opportunities, pathway, applications, fullProfile] = user
    ? await Promise.all([
        getCareerProfileByUserId(user.id),
        listCareerGoalsByUserId(user.id),
        listOpportunitiesByUserId(user.id),
        getActiveFullPathway(user.id),
        listApplicationsByUserId(user.id),
        getFullCareerProfile(user.id),
      ])
    : [null, [], [], null, [], { profile: null, educations: [], experiences: [], projects: [], skills: [], achievements: [], certifications: [], documents: [], workValues: [] }];

  if (profile?.isStudent) {
    redirect("/student");
  }

  const hasProfile = fullProfile.skills.length > 0 || fullProfile.experiences.length > 0;
  const hasGoal = goals.length > 0;
  const hasAnalyzedJob = opportunities.length > 0;

  const profileCompleteness = calculateProfileCompleteness(fullProfile, goals);

  const applicationSummary = summarize(applications);

  const [rawDiscovered, latestRun] = user
    ? await Promise.all([listDiscoveredJobsByUserId(user.id), getLatestRun(user.id)])
    : [[], null];
    
  const discovered = rawDiscovered.filter(job => {
    // Mirrors the strict Part-Time / Gig & Musician (Freelance) filtering on
    // the Discover page, so the dashboard's counts and top find agree with
    // what actually shows up there instead of counting jobs the mode would
    // then hide.
    if (fullProfile.profile?.isPartTimeMode && job.employmentType === "FULL_TIME") {
      return false;
    }
    if (
      fullProfile.profile?.isFreelanceMode &&
      job.employmentType !== "CONTRACT" &&
      job.employmentType !== "FREELANCE"
    ) {
      return false;
    }
    return matchesLocationPreference(job.location, job.workMode, {
      homeLocation: fullProfile.profile?.location ?? null,
      preferredLocations: fullProfile.profile?.preferredLocations ?? [],
      openToRemote: fullProfile.profile?.openToRemote ?? true
    });
  });
  const discoveryBuckets = bucketJobs(discovered);

  // Not yet applied to: "worth applying to now" used to count jobs you'd
  // already applied for.
  const notApplied = opportunities.filter((o) => o.status !== "APPLIED");
  const applyNow = notApplied.filter((o) => o.recommendation === "APPLY_NOW" || o.recommendation === "APPLY");
  const topPriority = [...notApplied].sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? null;

  const [dreamJobs, topPriorityJob] = user
    ? await Promise.all([
        listDreamJobsByUserId(user.id),
        topPriority ? getJobById(user.id, topPriority.jobId) : null,
      ])
    : [[], null];
  const bestDiscovered = discoveryBuckets.applyNow[0] ?? discoveryBuckets.strong[0] ?? null;
  const moves = listMoves({
    hasProfile,
    discoveredCount: discoveryBuckets.total,
    topDiscovered: bestDiscovered
      ? {
          title: bestDiscovered.title,
          company: bestDiscovered.company,
          // Same rule as Discover: too little to go on means no number shown.
          fitScore:
            bestDiscovered.fitCoverage != null && bestDiscovered.fitCoverage < MIN_COVERAGE_FOR_SCORE
              ? null
              : bestDiscovered.fitScore,
        }
      : null,
    topOpportunity: topPriority
      ? { id: topPriority.id, title: topPriorityJob?.title ?? null, company: topPriorityJob?.company ?? null, status: topPriority.status }
      : null,
    trackedCount: opportunities.length,
    applications,
    hasDreamJob: dreamJobs.length > 0,
    hasPathway: pathway != null,
    pathwayNext: pathway ? nextUpFor(pathway)?.label ?? null : null,
  });
  const briefing = buildBriefing({ moves, jobs: discovered, latestRun, applications });
  const isPro = user?.isPro ?? false;
  const planName = PAID_PLANS.find((p) => p.interval === user?.proPlan)?.name ?? null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Here's where things stand across your career profile, goals, and pipeline."
        action={<EnterStudentModeButton />}
      />

      <CommandCenter
        briefing={briefing}
        isPro={isPro}
        planName={planName}
        matchCount={discoveryBuckets.applyNow.length + discoveryBuckets.strong.length}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ProfileCompletenessCard completeness={profileCompleteness} />

        <Card>
          <CardHeader>
            <CardTitle>Career goals</CardTitle>
            <CardDescription>What you&apos;re currently working toward.</CardDescription>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <EmptyState
                icon={IconGoal}
                title="No goals set"
                description="Add a goal so Work-ly knows what to prioritize."
                action={{ label: "Add a goal", href: "/career-goals" }}
                className="border-0 px-0 py-2 text-left items-start"
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {goals.slice(0, 4).map((goal) => (
                    <Badge key={goal.id} variant="secondary">
                      {goal.title}
                    </Badge>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-fit">
                  <Link href="/career-goals">
                    View all goals
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <EmptyState
                icon={IconOpportunity}
                title="Nothing prioritized yet"
                description="Analyze a job to start building your pipeline."
                action={{ label: "Analyze a job", href: "/analyze-job" }}
                className="border-0 px-0 py-4"
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="figure text-3xl text-foreground" data-numeric>{opportunities.length}</p>
                  <p className="text-xs text-muted-foreground">
                    tracked · {applyNow.length} worth applying to now
                  </p>
                </div>
                {topPriority && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Highest priority
                    </p>
                    <Link href={`/opportunities/${topPriority.id}`} className="text-sm text-foreground underline-offset-2 hover:underline">
                      {topPriority.priorityScore}/100 priority · open it
                    </Link>
                  </div>
                )}
                <Button asChild size="sm" variant="outline" className="w-fit">
                  <Link href="/opportunities">
                    View opportunities
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <PathwayProgressCard pathway={pathway} />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {applicationSummary.applications === 0 ? (
              <EmptyState
                icon={IconApplication}
                title="Nothing tracked yet"
                description="Mark an opportunity as applied and it appears here."
                action={{ label: "Track an application", href: "/applications" }}
                className="border-0 px-0 py-4"
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="figure text-3xl text-foreground" data-numeric>
                      {applicationSummary.applications}
                    </p>
                    <p className="text-xs text-muted-foreground">Applications</p>
                  </div>
                  <div>
                    <p className="figure text-3xl text-foreground" data-numeric>
                      {applicationSummary.interviews}
                    </p>
                    <p className="text-xs text-muted-foreground">Interviews</p>
                  </div>
                  <div>
                    <p className="figure text-3xl text-foreground" data-numeric>
                      {applicationSummary.offers}
                    </p>
                    <p className="text-xs text-muted-foreground">Offers</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Interview rate
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {applicationSummary.interviewRate == null
                      ? "-"
                      : `${applicationSummary.interviewRate}%`}
                  </p>
                </div>

                <Button asChild size="sm" variant="outline" className="w-fit">
                  <Link href="/applications">
                    View applications
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
