import Link from "next/link";
import { ArrowRight, ChevronRight, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { BUCKETS } from "@/lib/discovery/labels";
import { plural, relativeTime, type Briefing, type BriefingMatch } from "@/lib/guidance/briefing";
import type { NextMove } from "@/lib/guidance/next-move";
import { cn } from "@/lib/utils";

/**
 * THE TOP OF HOME, built around one question: what should I do now?
 *
 *   - one large "next move" with a single button (where the eye lands),
 *   - the rest of today's moves as a short list beside it,
 *   - four numbers that say where the search stands,
 *   - best matches and the pipeline, one line each.
 *
 * Free accounts see the first move working and the rest locked, so Pro is
 * shown as work Work-ly would do rather than as a feature list.
 */

export function StatusLine({ briefing, isPro }: { briefing: Briefing; isPro: boolean }) {
  const check = briefing.lastCheck;
  if (!check) {
    return (
      <p className="text-sm text-muted-foreground">
        {isPro ? "Your first nightly check runs tonight." : "Find your first matches to get started."}
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Last check {relativeTime(check.at)} found{" "}
      <span className="font-medium text-foreground">{plural(check.newListings, "new listing")}</span>
      {check.strongNew > 0 && (
        <>
          , <span className="font-medium text-foreground">{plural(check.strongNew, "strong match")}</span>
        </>
      )}
      .
    </p>
  );
}

function LockedButton() {
  return (
    <UpgradeModal
      title="Plan your whole day with Pro"
      description="Pro ranks every move worth making today, reads new matches every night, and unlocks every AI tool."
    >
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
        <Lock className="size-3.5" aria-hidden />
        Pro
      </Button>
    </UpgradeModal>
  );
}

function NextMoveHero({ move }: { move: NextMove }) {
  return (
    <div className="flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your next move · {move.reason}</p>
        <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight text-balance text-foreground sm:text-[28px]">
          {move.title}
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground line-clamp-2">{move.body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg" className="gap-2">
          <Link href={move.cta.href}>
            {move.cta.label}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        {move.secondary && (
          <Link href={move.secondary.href} className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {move.secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function LaterMove({ move, locked }: { move: NextMove; locked: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className={cn("min-w-0", locked && "select-none opacity-60")}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{move.reason}</p>
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{move.title}</p>
      </div>
      {locked ? (
        <LockedButton />
      ) : (
        <Button asChild variant="ghost" size="icon" className="shrink-0" aria-label={move.cta.label}>
          <Link href={move.cta.href}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      )}
    </li>
  );
}

function Kpi({ label, value, href, accent = false }: { label: string; value: number; href: string; accent?: boolean }) {
  return (
    <Link href={href} className="group flex flex-col gap-1.5 bg-card px-5 py-4 transition-colors hover:bg-muted/60">
      <span className={cn("font-mono text-[26px] font-medium tabular-nums leading-none tracking-tight", accent && value > 0 ? "text-primary" : "text-foreground")}>
        {value}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
        {label}
        <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </span>
    </Link>
  );
}

function MatchRow({ match }: { match: BriefingMatch }) {
  const bucket = BUCKETS.find((b) => b.key === match.strength);
  return (
    <li>
      <Link href={match.href} className="group flex items-center gap-4 py-3 transition-colors">
        <span className={cn("w-9 shrink-0 text-right text-xl font-semibold tabular-nums", bucket?.tone)}>
          {match.fitScore ?? "–"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-4">
            {match.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {[match.company, bucket?.label, match.isNew ? "New" : null].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

function Panel({ title, action, children }: { title: string; action?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {action && (
          <Link href={action.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
            {action.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function CommandCenter({
  briefing,
  isPro,
  matchCount,
  kpis,
}: {
  briefing: Briefing;
  isPro: boolean;
  /** All strong + apply-now matches, for the "see all" link. */
  matchCount: number;
  kpis: { tracked: number; applications: number; interviews: number };
}) {
  const [lead, ...later] = briefing.moves;
  const pipelineTotal = briefing.pipeline.reduce((sum, s) => sum + s.count, 0);
  const maxStage = Math.max(1, ...briefing.pipeline.map((s) => s.count));

  return (
    <div className="flex flex-col gap-6">
      {lead && (
        <section
          aria-label="Your next move"
          className="grid overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:grid-cols-[1fr_320px] [background-image:radial-gradient(80%_120%_at_0%_0%,rgb(var(--glow)/0.09),transparent_60%)]"
        >
          <NextMoveHero move={lead} />
          {later.length > 0 && (
            <div className="border-t border-border p-6 lg:border-l lg:border-t-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Then</p>
              <ul className="flex flex-col divide-y divide-border/60">
                {later.slice(0, 3).map((move, i) => (
                  <LaterMove key={`${move.id}-${i}`} move={move} locked={!isPro} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* One strip with hairline dividers (the gap shows the border colour), not four boxes. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs md:grid-cols-4">
        <Kpi label="Strong matches" value={matchCount} href="/discover" accent />
        <Kpi label="Jobs tracked" value={kpis.tracked} href="/opportunities" />
        <Kpi label="Applications" value={kpis.applications} href="/applications" />
        <Kpi label="Interviews" value={kpis.interviews} href="/applications" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <Panel title="Best matches" action={{ label: matchCount > 0 ? `All ${matchCount}` : "Find matches", href: "/discover" }}>
            {briefing.matches.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No strong matches yet. {isPro ? "The nightly check keeps looking." : "Search Discover for new listings."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {briefing.matches.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <Panel title="Pipeline" action={{ label: "Applications", href: "/applications" }}>
            {pipelineTotal === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Track a job you like and it shows up here.</p>
            ) : (
              <div className="flex flex-col gap-4 pt-2">
                <ul className="flex flex-col gap-3">
                  {briefing.pipeline.map((stage) => (
                    <li key={stage.key} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span
                          className={cn("block h-full rounded-full", stage.key === "offer" ? "bg-success" : "bg-primary/70")}
                          style={{ width: `${(stage.count / maxStage) * 100}%` }}
                        />
                      </span>
                      <span className="text-right font-semibold tabular-nums text-foreground">{stage.count}</span>
                    </li>
                  ))}
                </ul>
                {briefing.interviewRate != null && (
                  <p className="text-sm text-muted-foreground">
                    Interview rate <span className="font-semibold tabular-nums text-foreground">{briefing.interviewRate}%</span>
                  </p>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {!isPro && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Pro</span> reads new jobs for you every night and writes a resume for each one.
            </span>
          </p>
          <UpgradeModal>
            <Button size="sm" className="shrink-0">
              See Pro plans
            </Button>
          </UpgradeModal>
        </div>
      )}
    </div>
  );
}
