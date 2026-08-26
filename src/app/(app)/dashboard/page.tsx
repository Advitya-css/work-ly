import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import {
  IconApplication,
  IconDashboard,
  IconDiscover,
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
import { buildAlert } from "@/lib/discovery/alerts";
import { BUCKETS } from "@/lib/discovery/labels";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
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
    : [null, [], [], null, [], { profile: null, educations: [], experiences: [], projects: [], skills: [], achievements: [], certifications: [], documents: [] }];

  const hasProfile = fullProfile.skills.length > 0 || fullProfile.experiences.length > 0;
  const hasGoal = goals.length > 0;
  const hasAnalyzedJob = opportunities.length > 0;

  const profileCompleteness = calculateProfileCompleteness(fullProfile, goals);

  const applicationSummary = summarize(applications);

  const [rawDiscovered, latestRun] = user
    ? await Promise.all([listDiscoveredJobsByUserId(user.id), getLatestRun(user.id)])
    : [[], null];
    
  const discovered = rawDiscovered.filter(job => matchesLocationPreference(job.location, job.workMode, {
    homeLocation: fullProfile.profile?.location ?? null,
    preferredLocations: fullProfile.profile?.preferredLocations ?? [],
    openToRemote: fullProfile.profile?.openToRemote ?? true
  }));
  const discoveryBuckets = bucketJobs(discovered);
  const discoveryAlert = buildAlert(latestRun, discovered);

  const applyNow = opportunities.filter((o) => o.recommendation === "APPLY_NOW" || o.recommendation === "APPLY");
  const topPriority = [...opportunities].sort((a, b) => b.priorityScore - a.priorityScore)[0] ?? null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Here's where things stand across your career profile, goals, and pipeline."
      />

      {/*
        The way into student mode. It sits at the top rather than in
        Settings because someone who needs it needs it on their first visit,
        before they have had any reason to go looking through preferences.
      */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">At university?</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Switch to campus jobs, internships, and the work rules that apply to student work.
          </p>
        </div>
        <EnterStudentModeButton />
      </div>

      {/* New opportunities for you. Spec requirement #10 */}
      <Card>
        <CardHeader>
          <CardTitle>
            New opportunities for you
          </CardTitle>
          <CardDescription>
            {discoveryAlert.shouldNotify
              ? `${discoveryAlert.headline} ${discoveryAlert.body}`
              : "Pulled from sources that permit it, scored against your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discoveryBuckets.total === 0 ? (
            <EmptyState
              icon={IconDiscover}
              title="Nothing discovered yet"
              description="Run discovery to pull in listings and see them sorted by what's worth your time."
              action={{ label: "Discover opportunities", href: "/discover" }}
              className="border-0 px-0 py-4"
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-4">
                {BUCKETS.map((bucket) => (
                  <div key={bucket.key} className="flex items-baseline gap-1.5">
                    <bucket.icon className={`size-4 self-center ${bucket.tone}`} />
                    <span className="text-xl font-bold tabular-nums text-foreground">
                      {discoveryBuckets[bucket.key].length}
                    </span>
                    <span className="text-xs text-muted-foreground">{bucket.label}</span>
                  </div>
                ))}
              </div>
              {discoveryBuckets.applyNow[0] && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Top find:{" "}
                  <span className="font-medium text-foreground break-words">
                    {discoveryBuckets.applyNow[0].title}
                  </span>
                  {discoveryBuckets.applyNow[0].company
                    ? ` at ${discoveryBuckets.applyNow[0].company}`
                    : ""}
                </p>
              )}
              <Button asChild size="sm" variant="outline" className="w-fit">
                <Link href="/discover">
                  Review {discoveryBuckets.total} discovered
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                description="Add a goal so Workly knows what to prioritize."
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
                    <p className="text-sm text-foreground">{topPriority.priorityScore}/100 priority score</p>
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
