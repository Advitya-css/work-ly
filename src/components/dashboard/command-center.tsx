import Link from "next/link";
import { ArrowRight, BookOpenCheck, Crown, Lock, Moon, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { BUCKETS } from "@/lib/discovery/labels";
import { plural, relativeTime, type Briefing, type BriefingMatch } from "@/lib/guidance/briefing";
import type { NextMove } from "@/lib/guidance/next-move";
import { cn } from "@/lib/utils";

/**
 * THE COMMAND CENTER - the top of the dashboard.
 *
 * Pro: a briefing of work already done - what the nightly check found and
 * read, the few moves worth making today (in order), the best matches and
 * where the pipeline stands.
 *
 * Free: the same screen with the first move fully usable and the rest of
 * the day's plan locked, so the upgrade is shown as work Work-ly would do,
 * not as a feature list. Matches and the pipeline are the user's own free
 * data and are never hidden.
 */

function StatusLine({ briefing, isPro }: { briefing: Briefing; isPro: boolean }) {
  const check = briefing.lastCheck;
  if (!check) {
    return (
      <p className="text-sm text-muted-foreground">
        {isPro
          ? "Your first check runs tonight. Or find matches now and they'll show up here."
          : "No job search yet. Find your first matches and they'll show up here."}
      </p>
    );
  }
  const found = `${plural(check.newListings, "new listing")}${
    check.readInFull > 0 ? `, ${check.readInFull} read in full` : ""
  }${check.strongNew > 0 ? `, ${plural(check.strongNew, "strong match")}` : ""}`;
  return (
    <p className="text-sm text-muted-foreground">
      Last check {relativeTime(check.at)}: <span className="text-foreground">{found}</span>.{" "}
      {isPro ? "Work-ly checks again every night." : "With Pro, Work-ly checks and reads new listings for you every night."}
    </p>
  );
}

function MoveRow({ move, index, locked }: { move: NextMove; index: number; locked: boolean }) {
  const lead = index === 0;
  return (
    <li className={cn("flex gap-3 py-4 first:pt-0 last:pb-0", lead ? "items-start" : "items-center")}>
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
          lead ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className={cn("flex min-w-0 flex-col gap-1", locked && "select-none")}>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{move.reason}</p>
          <p className={cn("font-semibold leading-snug text-balance text-foreground", lead ? "text-lg" : "text-base")}>
            {move.title}
          </p>
          {lead && <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{move.body}</p>}
          {lead && move.secondary && (
            <Link
              href={move.secondary.href}
              className="w-fit text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {move.secondary.label}
            </Link>
          )}
        </div>
        <div className="shrink-0">
          {locked ? (
            <UpgradeModal
              title="Plan your whole day with Pro"
              description="Pro ranks every move worth making today, refreshes and reads your matches every night, and unlocks every AI tool."
            >
              <Button variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto">
                <Lock className="size-3.5" aria-hidden />
                Unlock with Pro
              </Button>
            </UpgradeModal>
          ) : (
            <Button asChild size={lead ? "default" : "sm"} variant={lead ? "default" : "outline"} className="w-full sm:w-auto">
              <Link href={move.cta.href}>
                {move.cta.label}
                <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function MatchRow({ match }: { match: BriefingMatch }) {
  const bucket = BUCKETS.find((b) => b.key === match.strength);
  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {bucket && <bucket.icon className={cn("size-4 shrink-0", bucket.tone)} aria-label={bucket.label} />}
        <Link
          href={match.href}
          className="min-w-0 font-medium text-foreground underline-offset-2 line-clamp-2 break-words hover:underline"
        >
          {match.title}
          {match.company ? <span className="font-normal text-muted-foreground"> · {match.company}</span> : null}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {match.fitScore != null && <Badge variant="outline">Fit {match.fitScore}/100</Badge>}
        {match.readInFull && (
          <Badge variant="secondary" className="gap-1">
            <BookOpenCheck className="size-3" aria-hidden />
            Read in full
          </Badge>
        )}
        {match.isNew && <Badge variant="success">New</Badge>}
      </div>
      {match.reason && <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{match.reason}</p>}
    </li>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action && (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
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
  planName,
  matchCount,
}: {
  briefing: Briefing;
  isPro: boolean;
  /** "Yearly Pass" etc; null for beta / referral Pro. */
  planName: string | null;
  /** All strong + apply-now matches, for the "see all" link. */
  matchCount: number;
}) {
  const pipelineTotal = briefing.pipeline.reduce((sum, s) => sum + s.count, 0);
  const maxStage = Math.max(1, ...briefing.pipeline.map((s) => s.count));

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="briefing-title"
        className="overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-sm"
      >
        <div className="flex flex-col gap-1.5 border-b border-primary/15 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="briefing-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              {isPro ? <Moon className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {isPro ? "Your briefing" : "Your briefing · Pro preview"}
            </h2>
            {isPro ? (
              <Badge className="gap-1">
                <Crown className="size-3" aria-hidden />
                Pro{planName ? ` · ${planName}` : ""}
              </Badge>
            ) : null}
          </div>
          <StatusLine briefing={briefing} isPro={isPro} />
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="mb-3 text-sm font-semibold text-foreground">
            {briefing.moves.length > 1 ? "Today, in this order" : "Today"}
          </p>
          <ol className="flex flex-col divide-y divide-border/60">
            {briefing.moves.map((move, i) => (
              <MoveRow key={`${move.id}-${i}`} move={move} index={i} locked={!isPro && i > 0} />
            ))}
          </ol>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <Panel
            title="Best matches"
            action={matchCount > 0 ? { label: `All ${matchCount}`, href: "/discover" } : { label: "Find matches", href: "/discover" }}
          >
            {briefing.matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Apply now or Strong matches yet.{" "}
                {isPro ? "The nightly check keeps looking." : "Run Discover to look for new listings."}
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
              <p className="text-sm text-muted-foreground">
                Nothing tracked yet. Press Analyze &amp; track on a match to start your pipeline.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <ul className="flex flex-col gap-2.5">
                  {briefing.pipeline.map((stage) => (
                    <li key={stage.key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
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

      {isPro ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Last 30 days:</span>{" "}
          <span className="tabular-nums">
            {plural(briefing.last30.listingsChecked, "listing")} checked · {briefing.last30.readInFull} read in full ·{" "}
            {plural(briefing.last30.applications, "application")} · {plural(briefing.last30.interviews, "interview")}
          </span>
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Pro plans your whole day:</span> every move ranked, matches refreshed
            and read every night, and every AI tool - tailored resumes, mock interviews, hiring-manager notes.
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
