import Link from "next/link";
import { TrendingUp } from "lucide-react";

import { ReadinessChart } from "./readiness-chart";
import { RecheckButton } from "./recheck-button";
import { LockedBars, YearlyUpgradeButton } from "./yearly-upgrade";
import type { ReadinessSnapshot } from "@/lib/db/readiness-snapshots";

function fmt(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Career progress tracker (yearly perk): readiness for the dream job,
 * re-checked monthly, charted over time. Everyone's analyses are recorded,
 * so a member who upgrades already has a history to look at.
 */
export function ProgressCard({
  dreamJob,
  currentScore,
  snapshots,
  unlocked,
}: {
  dreamJob: { id: string; title: string } | null;
  currentScore: number | null;
  snapshots: ReadinessSnapshot[];
  unlocked: boolean;
}) {
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const delta = first && last && snapshots.length > 1 ? last.readinessScore - first.readinessScore : null;
  const stepsGained =
    first?.stepsCompleted != null && last?.stepsCompleted != null ? last.stepsCompleted - first.stepsCompleted : null;

  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="progress-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="size-4 text-primary" aria-hidden />
            Career progress tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            {dreamJob
              ? <>How ready you are for <span className="font-medium text-foreground">{dreamJob.title}</span>, re-checked every month.</>
              : "How ready you are for your dream job, re-checked every month."}
          </p>
        </div>
        {unlocked && dreamJob && <RecheckButton dreamJobId={dreamJob.id} />}
      </div>

      {!dreamJob ? (
        <p className="text-sm text-muted-foreground">
          Start by checking a role you want.{" "}
          <Link href="/dream-job" className="font-medium text-primary underline-offset-4 hover:underline">
            Analyze your dream job
          </Link>{" "}
          and every re-check after that becomes a point on this chart.
        </p>
      ) : unlocked ? (
        <>
          {delta != null && (
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {first.readinessScore} → {last.readinessScore}
              <span className={`ml-2 text-sm font-medium ${delta >= 0 ? "text-success" : "text-warning"}`}>
                {delta >= 0 ? `+${delta}` : delta} since {fmt(first.createdAt)}
              </span>
            </p>
          )}
          {snapshots.length > 0 ? (
            <ReadinessChart snapshots={snapshots} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Your first point appears after the next re-check. Press Re-check now to add it today.
            </p>
          )}
          {stepsGained != null && stepsGained > 0 && (
            <p className="text-sm text-muted-foreground">
              You completed {stepsGained} pathway step{stepsGained === 1 ? "" : "s"} over this stretch.
            </p>
          )}
          {snapshots.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Every check</summary>
              <ul className="mt-2 flex flex-col gap-1 tabular-nums">
                {[...snapshots].reverse().map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 border-b border-border py-1 last:border-0">
                    <span className="text-muted-foreground">
                      {fmt(s.createdAt)} · {s.source === "monthly" ? "monthly re-check" : "full analysis"}
                    </span>
                    <span className="font-medium text-foreground">{s.readinessScore}/100</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {currentScore != null ? (
              <>
                You&apos;re at <span className="font-semibold text-foreground">{currentScore}/100</span> today
                {snapshots.length > 1 ? `, with ${snapshots.length} checks recorded so far` : ""}. Yearly members see
                this re-checked every month and charted, so the climb is visible.
              </>
            ) : (
              "Yearly members see this re-checked every month and charted, so the climb is visible."
            )}
          </p>
          <LockedBars rows={3} />
          <YearlyUpgradeButton />
        </>
      )}
    </section>
  );
}
