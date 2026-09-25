import type { ApplicationStatus, DiscoveredJob, DiscoveryRun } from "@/lib/db/types";
import { isAiScreened } from "@/lib/discovery/sort";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import type { NextMove } from "./next-move";

/**
 * THE BRIEFING - the top of the dashboard.
 *
 * Pro isn't a list of tools you go and open; it's work already done when
 * you arrive. The briefing says what changed since the last check, the
 * few things worth doing today, and the best new matches - every number
 * counted from the user's own data, never estimated.
 *
 * Pure: the dashboard gathers the facts, this shapes them.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const BRIEFING_MOVES = 3;

export interface BriefingMatch {
  id: string;
  title: string;
  company: string | null;
  /** Null when Work-ly had too little to go on to show a number. */
  fitScore: number | null;
  strength: "applyNow" | "strong";
  /** The AI screen's one-line verdict, or the best rules-engine reason. */
  reason: string | null;
  readInFull: boolean;
  isNew: boolean;
  href: string;
}

export interface LastCheck {
  at: Date;
  newListings: number;
  readInFull: number;
  strongNew: number;
}

export interface PipelineStage {
  key: "saved" | "applied" | "assessment" | "interview" | "offer";
  label: string;
  count: number;
}

export interface Briefing {
  moves: NextMove[];
  matches: BriefingMatch[];
  lastCheck: LastCheck | null;
  pipeline: PipelineStage[];
  /** Applications that ever reached interview / applications sent, as a %. Null below 3 sent. */
  interviewRate: number | null;
  last30: { listingsChecked: number; readInFull: number; applications: number; interviews: number };
}

export interface BriefingApplication {
  status: ApplicationStatus;
  dateApplied: Date | null;
  createdAt: Date;
  reachedInterviewAt: Date | null;
}

function isStrong(job: DiscoveredJob): boolean {
  return job.recommendation === "APPLY_NOW" || job.recommendation === "APPLY";
}

function visible(job: DiscoveredJob): boolean {
  return !job.isDismissed && !job.duplicateOfId && !job.convertedOpportunityId;
}

function reasonFor(job: DiscoveredJob): string | null {
  const reasons = Array.isArray(job.matchReasons) ? job.matchReasons : [];
  const r = reasons.find((m) => m.kind === "screen") ?? reasons.find((m) => m.kind === "skill");
  return r?.text?.trim() || null;
}

function shownFit(job: DiscoveredJob): number | null {
  if (job.fitScore == null) return null;
  if (job.fitCoverage != null && job.fitCoverage < MIN_COVERAGE_FOR_SCORE) return null;
  return job.fitScore;
}

export function buildBriefing(input: {
  moves: NextMove[];
  jobs: DiscoveredJob[];
  latestRun: DiscoveryRun | null;
  applications: BriefingApplication[];
  now?: Date;
}): Briefing {
  const now = (input.now ?? new Date()).getTime();
  const live = input.jobs.filter(visible);

  // "Since the last check" = listings that run brought in.
  const run = input.latestRun && input.latestRun.status !== "FAILED" ? input.latestRun : null;
  const since = run ? new Date(run.startedAt).getTime() : null;
  const fromLastRun = since == null ? [] : live.filter((j) => new Date(j.discoveredAt).getTime() >= since);
  const lastCheck: LastCheck | null = run
    ? {
        at: new Date(run.completedAt ?? run.startedAt),
        newListings: fromLastRun.length,
        readInFull: fromLastRun.filter(isAiScreened).length,
        strongNew: fromLastRun.filter(isStrong).length,
      }
    : null;

  // Best matches: Apply now before Strong, then read-in-full before not,
  // then Fit. New listings from the last check win ties.
  const matches = live
    .filter(isStrong)
    .sort((a, b) => {
      const tier = (j: DiscoveredJob) => (j.recommendation === "APPLY_NOW" ? 0 : 1);
      if (tier(a) !== tier(b)) return tier(a) - tier(b);
      const read = Number(isAiScreened(b)) - Number(isAiScreened(a));
      if (read !== 0) return read;
      const fit = (shownFit(b) ?? 0) - (shownFit(a) ?? 0);
      if (fit !== 0) return fit;
      return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
    })
    .slice(0, 3)
    .map<BriefingMatch>((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      fitScore: shownFit(job),
      strength: job.recommendation === "APPLY_NOW" ? "applyNow" : "strong",
      reason: reasonFor(job),
      readInFull: isAiScreened(job),
      isNew: since != null && new Date(job.discoveredAt).getTime() >= since,
      href: `/discover#job-${job.id}`,
    }));

  const apps = input.applications;
  const count = (...statuses: ApplicationStatus[]) => apps.filter((a) => statuses.includes(a.status)).length;
  const pipeline: PipelineStage[] = [
    { key: "saved", label: "Saved", count: count("SAVED", "PREPARING") },
    { key: "applied", label: "Applied", count: count("APPLIED") },
    { key: "assessment", label: "Assessment", count: count("ASSESSMENT") },
    { key: "interview", label: "Interview", count: count("INTERVIEW", "FINAL_INTERVIEW") },
    { key: "offer", label: "Offer", count: count("OFFER") },
  ];

  const sent = apps.filter((a) => a.dateApplied != null || !["SAVED", "PREPARING"].includes(a.status));
  const interviewRate =
    sent.length >= 3 ? Math.round((sent.filter((a) => a.reachedInterviewAt != null).length / sent.length) * 100) : null;

  const within30 = (d: Date | null) => d != null && now - new Date(d).getTime() <= 30 * DAY_MS;
  const recent = input.jobs.filter((j) => within30(j.discoveredAt) && !j.duplicateOfId);

  return {
    // "Look for new matches" is only filler; the nightly check does it for Pro.
    moves: (input.moves.length > 1 ? input.moves.filter((m) => m.id !== "discover-more") : input.moves).slice(
      0,
      BRIEFING_MOVES,
    ),
    matches,
    lastCheck,
    pipeline,
    interviewRate,
    last30: {
      listingsChecked: recent.length,
      readInFull: recent.filter(isAiScreened).length,
      applications: apps.filter((a) => within30(a.dateApplied ?? a.createdAt) && a.status !== "SAVED").length,
      interviews: apps.filter((a) => within30(a.reachedInterviewAt)).length,
    },
  };
}

/** "2 hours ago", "yesterday", "5 days ago". */
export function relativeTime(date: Date, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(date).getTime());
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** "1 strong match", "2 strong matches", "14 new listings". */
export function plural(n: number, word: string): string {
  if (n === 1) return `${n} ${word}`;
  return `${n} ${word}${/(ch|sh|s|x)$/.test(word) ? "es" : "s"}`;
}
