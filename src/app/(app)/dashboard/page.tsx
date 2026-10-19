import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PLAN_INTENT_COOKIE, isPaidInterval } from "@/lib/payments/plan-intent";
import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";

import { EnterStudentModeButton } from "@/components/student/student-mode-buttons";
import { Badge } from "@/components/ui/badge";
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
import { displayJobTitle } from "@/lib/format";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { CommandCenter, StatusLine } from "@/components/dashboard/command-center";
import { Progress } from "@/components/ui/progress";
import { GraderImportCard } from "@/components/onboarding/grader-import-card";

export const metadata: Metadata = { title: "Dashboard" };
// "Pick up where you left off" builds a profile and a Fit report in one
// server action (two AI parses and a screen) - allow it the time.
export const maxDuration = 180;

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

  // Picked a plan on the Pricing page before signing up: take them to it.
  const planIntent = (await cookies()).get(PLAN_INTENT_COOKIE)?.value;
  if (user && isPaidInterval(planIntent)) {
    redirect(`/upgrade?plan=${planIntent}`);
  }

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
      ? { id: topPriority.id, title: topPriorityJob?.title ? displayJobTitle(topPriorityJob.title) : null, company: topPriorityJob?.company ?? null, status: topPriority.status }
      : null,
    trackedCount: opportunities.length,
    applications,
    hasDreamJob: dreamJobs.length > 0,
    hasPathway: pathway != null,
    pathwayNext: pathway ? nextUpFor(pathway)?.label ?? null : null,
  });
  const briefing = buildBriefing({ moves, jobs: discovered, latestRun, applications });
  const isPro = user?.isPro ?? false;
  const planName = user?.proPlan === "trial" ? "1-day trial" : (PAID_PLANS.find((p) => p.interval === user?.proPlan)?.name ?? null);

  const firstName = user?.name ? user.name.split(" ")[0] : null;
  const topMissing = profileCompleteness.missing[0] ?? null;
  const target = goals.find((g) => g.status === "ACTIVE") ?? goals[0] ?? null;
  const targetRole = target?.primaryTargetRole || target?.targetRole || target?.title || null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <StatusLine briefing={briefing} isPro={isPro} />
        </div>
        {isPro && (
          <Badge variant="secondary" className="w-fit gap-1">
            <Crown className="size-3" aria-hidden />
            Pro{planName ? ` · ${planName}` : ""}
          </Badge>
        )}
      </header>

      <GraderImportCard hasProfile={hasProfile} />

      <CommandCenter
        briefing={briefing}
        isPro={isPro}
        matchCount={discoveryBuckets.applyNow.length + discoveryBuckets.strong.length}
        kpis={{ tracked: opportunities.length, applications: applicationSummary.applications, interviews: applicationSummary.interviews }}
      />

      {/* What Work-ly works from: the profile and the target role, in one line each. */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/career-profile"
          className="group flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold text-foreground">Your profile</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{profileCompleteness.percentage}%</span>
          </div>
          <Progress value={profileCompleteness.percentage} label="Profile completeness" />
          <span className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span className="truncate">{topMissing ? `Next: ${topMissing.hint}` : "Complete. Matches use all of it."}</span>
            <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
        <Link
          href="/career-goals"
          className="group flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
        >
          <span className="text-base font-semibold text-foreground">Your target</span>
          <span className="truncate text-lg font-medium text-foreground">{targetRole ?? "Not set yet"}</span>
          <span className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{targetRole ? "Discover searches for this role." : "Set the role you want so matches aim for it."}</span>
            <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      </section>

      <div className="flex justify-center">
        <EnterStudentModeButton variant="ghost" label="I'm a student: switch to student mode" />
      </div>
    </div>
  );
}

