import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrackMatchButton } from "@/components/onboarding/track-match-button";
import { completeOnboardingAction } from "@/lib/onboarding/actions";
import { listDiscoveredJobsByUserId } from "@/lib/db/discovery";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { matchesLocationPreference } from "@/lib/jobs/location-match";
import { bucketJobs } from "@/lib/discovery/run";
import { comparePriority, recommendationRank } from "@/lib/discovery/sort";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { RECOMMENDATION_LABEL } from "@/lib/jobs/labels";
import { placeLine } from "@/lib/places";
import type { OnboardingIntent } from "@/lib/onboarding/intent";
import type { DiscoveredJob } from "@/lib/db/types";

/** The reasons worth showing on a first look: the AI screen's verdict first, then concrete skill matches. */
function whyItFits(job: DiscoveredJob): string[] {
  const reasons = job.matchReasons ?? [];
  const order = ["screen", "skill", "seniority", "location"];
  return reasons
    .filter((r) => order.includes(r.kind) && r.text?.trim())
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .map((r) => r.text.trim())
    .slice(0, 2);
}

function watchOut(job: DiscoveredJob): string | null {
  return job.matchReasons?.find((r) => r.kind === "gap" && r.text?.trim())?.text.trim() ?? null;
}

const NEXT_STEPS = [
  { title: "Track a job", body: "Get the full fit breakdown: what you match, what's missing, and whether it's worth your time." },
  { title: "Tailor your application", body: "A resume and cover letter for that job, plus a note to the hiring manager." },
  { title: "Move it forward", body: "Mock interviews unlock when you get an interview; offer help when you get an offer." },
];

/**
 * The end of the first session: the user's three best matches, scored, with
 * the reason each one fits. This is the moment Work-ly has to earn a second
 * visit - a list of 60 listings (where the flow used to land) asks them to
 * do the sorting themselves.
 */
export async function MatchesStep({ userId, intent }: { userId: string; intent: OnboardingIntent }) {
  const [jobs, profile] = await Promise.all([listDiscoveredJobsByUserId(userId), getCareerProfileByUserId(userId)]);

  const inScope = jobs.filter((job) => {
    if (profile?.isFreelanceMode && job.employmentType !== "CONTRACT" && job.employmentType !== "FREELANCE") return false;
    return matchesLocationPreference(job.location, job.workMode, {
      homeLocation: profile?.location ?? null,
      preferredLocations: profile?.preferredLocations ?? [],
      openToRemote: profile?.openToRemote ?? true,
    });
  });
  const buckets = bucketJobs(inScope);
  const top = [...buckets.applyNow, ...buckets.strong, ...buckets.stretch]
    .map((job) => ({ job, score: 0 }))
    .sort(comparePriority)
    .slice(0, 3)
    .map((r) => r.job)
    // Shown best-first by the number the user can see: within the same
    // tier, a Fit 69 listed under a Fit 64 reads as a mistake even when
    // freshness put it there.
    .sort(
      (a, b) =>
        recommendationRank(b.recommendation) - recommendationRank(a.recommendation) ||
        (b.fitScore ?? 0) - (a.fitScore ?? 0),
    );

  return (
    <div className="flex w-full flex-col gap-8 text-left">
      <div className="text-center">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          Your first matches
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
          {top.length > 0 ? "Start with these" : "Nothing strong enough to show yet"}
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          {top.length > 0
            ? `Work-ly checked ${buckets.total} listing${buckets.total === 1 ? "" : "s"} against your resume. These ${top.length === 1 ? "is the one" : `are the ${top.length}`} most worth your time.`
            : "The first search didn't turn up roles that fit your profile well. Try a different search, or add more detail to your profile so matches can be scored properly."}
        </p>
      </div>

      {top.length > 0 && (
        <ol className="flex flex-col gap-3">
          {top.map((job) => {
            const reliable = job.fitScore != null && (job.fitCoverage == null || job.fitCoverage >= MIN_COVERAGE_FOR_SCORE);
            const reasons = whyItFits(job);
            const gap = watchOut(job);
            const where = placeLine(job.location, job.country, " · ");
            return (
              <li key={job.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-snug text-foreground">{job.title}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                      {job.company && <span className="font-medium text-foreground/80">{job.company}</span>}
                      {where && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden />
                          {where}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    {reliable && (
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        Candidate Fit is {job.fitScore}/100
                      </p>
                    )}
                    {job.recommendation && (
                      <Badge variant={job.recommendation === "STRETCH" ? "warning" : "success"}>
                        {RECOMMENDATION_LABEL[job.recommendation] ?? job.recommendation}
                      </Badge>
                    )}
                  </div>
                </div>

                {(reasons.length > 0 || gap) && (
                  <div className="flex flex-col gap-1.5 text-sm">
                    {reasons.map((reason) => (
                      <p key={reason} className="text-muted-foreground">
                        <span className="font-medium text-success">Fits: </span>
                        {reason}
                      </p>
                    ))}
                    {gap && (
                      <p className="text-muted-foreground">
                        <span className="font-medium text-warning">Watch out: </span>
                        {gap}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <TrackMatchButton discoveredJobId={job.id} />
                  {job.sourceUrl && (
                    <Button asChild size="sm" variant="ghost" className="w-full text-muted-foreground sm:w-auto">
                      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                        View the posting
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-labelledby="what-next" className="rounded-xl border border-dashed border-border p-4 sm:p-5">
        <h2 id="what-next" className="text-sm font-semibold text-foreground">
          What happens from here
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {NEXT_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {intent === "switch" && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Planning a bigger move?</p>
            <p className="text-sm text-muted-foreground">
              Paste a posting for the role you really want and see how close you are. Your first one is free.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
            <Link href="/dream-job">
              Check my dream job
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href="/discover">{buckets.total > 0 ? `See all ${buckets.total} listings` : "Search again in Discover"}</Link>
        </Button>
        <form action={completeOnboardingAction}>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Go to my dashboard
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}
