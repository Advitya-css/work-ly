import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SectionTabs } from "@/components/shared/section-tabs";
import { IconInsight } from "@/components/icons";
import { JobWatchCard } from "@/components/insights/job-watch-card";
import { ProgressCard } from "@/components/insights/progress-card";
import { MarketValueCard } from "@/components/insights/market-value-card";
import { YearlyUpgradeButton } from "@/components/insights/yearly-upgrade";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/pool";
import { listDreamJobsByUserId } from "@/lib/db/dream-jobs";
import { getDreamJobAnalysisByDreamJobId } from "@/lib/db/dream-job-analyses";
import { listReadinessSnapshots } from "@/lib/db/readiness-snapshots";
import { listDiscoveredJobsByUserId } from "@/lib/db/discovery";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { buildMarketValue, risingSkills } from "@/lib/insights/market-value";
import { hasYearlyPerks, YEARLY_PERKS } from "@/lib/plans";

export const metadata: Metadata = { title: "Insights" };
// "Re-check now" runs one screening call.
// Several AI calls in a row (parse, then screen) can pass 60s when the model is busy.
export const maxDuration = 180;

function relative(date: Date): string {
  const hours = Math.round((Date.now() - new Date(date).getTime()) / 3_600_000);
  if (hours < 1) return "within the last hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * The yearly pass's home: the three perks that keep working after the job
 * hunt ends. Everyone can open it - locked perks show what they'd do with
 * the user's own numbers - so the yearly pass sells itself on real data.
 */
export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unlocked = hasYearlyPerks(user);

  const [dreamJobs, jobs, goal, profile, watchRow] = await Promise.all([
    listDreamJobsByUserId(user.id),
    listDiscoveredJobsByUserId(user.id),
    getPrimaryCareerGoal(user.id),
    getCareerProfileByUserId(user.id),
    pool
      .query(`SELECT "lastWatchAt" FROM users WHERE id = $1`, [user.id])
      .then((r) => (r.rows[0]?.lastWatchAt as Date | null) ?? null)
      .catch(() => null),
  ]);

  const dreamJob = dreamJobs.find((d) => d.status === "PARSED") ?? null;
  const [analysis, snapshots] = dreamJob
    ? await Promise.all([getDreamJobAnalysisByDreamJobId(dreamJob.id), listReadinessSnapshots(user.id, dreamJob.id)])
    : [null, []];

  const targetRole = goal?.primaryTargetRole ?? goal?.targetRole ?? null;
  const targets = [targetRole, ...(goal?.secondaryTargetRoles ?? []), profile?.currentRole];
  const value = buildMarketValue(jobs, targets);
  const rising = risingSkills(jobs, targets);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        description="The long game: where you stand in the market, how you're progressing, and a watch that never stops."
        icon={IconInsight}
        area="career"
      />
      <SectionTabs section="career" />

      {!unlocked && (
        <section className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <CalendarCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-foreground">Yearly Pass perks</p>
              <p className="max-w-prose text-sm text-muted-foreground">
                {YEARLY_PERKS.map((p) => p.name).join(", ")}. The parts of Work-ly that keep working after you land
                the job. Everything below uses your own data, so you can see what you&apos;d get.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <YearlyUpgradeButton label="See the Yearly Pass" />
          </div>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <MarketValueCard value={value} rising={rising} targetRole={targetRole} unlocked={unlocked} />
        <div className="flex flex-col gap-6">
          <ProgressCard
            dreamJob={dreamJob ? { id: dreamJob.id, title: dreamJob.title ?? dreamJob.dreamRole } : null}
            currentScore={analysis?.readinessScore ?? null}
            snapshots={snapshots}
            unlocked={unlocked}
          />
          <JobWatchCard
            unlocked={unlocked}
            enabled={user.watchEnabled ?? false}
            minFit={user.watchMinFit ?? 85}
            lastCheckedLabel={watchRow ? relative(watchRow) : null}
          />
        </div>
      </div>
    </div>
  );
}
