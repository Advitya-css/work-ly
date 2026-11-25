/**
 * READY TO APPLY - the pure half.
 *
 * Every night Work-ly searches for the member's target role and reads the
 * best new listings in full (cron/pro-briefing). This is what turns that
 * search into something worth paying for: for the few listings that come
 * out as a real "apply", it also writes the resume, the cover letter and
 * the note to the hiring manager, so the morning starts with applications
 * ready to send instead of a list of links.
 *
 * Kept free of the database and the model so the choices it makes (which
 * listings are worth writing for, what the morning list says) are tested.
 */

import type { MatchReason, RecommendationType } from "@/lib/db/types";

/** How many listings a night gets written for. Each costs four model calls. */
export const MORNING_LIMIT = 3;

/** Below this the fit is too thin to spend a night's writing on. */
export const MORNING_MIN_FIT = 70;

/** Only listings found this recently: a week-old posting isn't news. */
export const MORNING_LOOKBACK_DAYS = 3;

/** How long a morning list stays on Home before it's old news. */
export const MORNING_SHOWN_DAYS = 4;

const APPLY: ReadonlySet<RecommendationType> = new Set(["APPLY_NOW", "APPLY"]);

export interface MorningCandidate {
  id: string;
  title: string;
  company: string | null;
  fitScore: number | null;
  fitCoverage: number | null;
  recommendation: RecommendationType | null;
  matchReasons: MatchReason[] | null;
  description: string | null;
  discoveredAt: Date | string;
  /** Where the posting lives, so the morning list can send them there. */
  sourceUrl?: string | null;
}

/** The read that explains the fit: the AI's own line when there is one. */
export function reasonFrom(reasons: MatchReason[] | null | undefined): string | null {
  const list = Array.isArray(reasons) ? reasons : [];
  const pick = list.find((r) => r.kind === "screen") ?? list.find((r) => r.kind === "skill");
  const text = pick?.text?.trim();
  return text ? text.slice(0, 220) : null;
}

/** True once the listing has had the full AI read, not just the rules engine. */
export function wasReadInFull(reasons: MatchReason[] | null | undefined): boolean {
  return Array.isArray(reasons) && reasons.some((r) => r.kind === "screen");
}

/**
 * Which listings get written for tonight: recent, an "apply", a fit worth
 * the work, enough of the posting to tailor against, read in full. Best
 * fit first, a read-in-full listing ahead of one that wasn't.
 */
export function pickMorningCandidates(
  rows: MorningCandidate[],
  options: { now?: Date; limit?: number; minFit?: number; minCoverage?: number; lookbackDays?: number } = {},
): MorningCandidate[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? MORNING_LIMIT;
  const minFit = options.minFit ?? MORNING_MIN_FIT;
  const minCoverage = options.minCoverage ?? 0.4;
  const since = now.getTime() - (options.lookbackDays ?? MORNING_LOOKBACK_DAYS) * 24 * 60 * 60 * 1000;
  return rows
    .filter((r) => {
      const found = new Date(r.discoveredAt).getTime();
      return (
        Number.isFinite(found) &&
        found >= since &&
        r.recommendation != null &&
        APPLY.has(r.recommendation) &&
        r.fitScore != null &&
        r.fitScore >= minFit &&
        (r.fitCoverage == null || r.fitCoverage >= minCoverage) &&
        (r.description ?? "").trim().length >= 200
      );
    })
    .sort((a, b) => {
      const full = Number(wasReadInFull(b.matchReasons)) - Number(wasReadInFull(a.matchReasons));
      return full !== 0 ? full : (b.fitScore ?? 0) - (a.fitScore ?? 0);
    })
    .slice(0, limit);
}

export type MorningKind = "resume" | "cover" | "note";

export interface MorningItem {
  opportunityId: string;
  title: string;
  company: string | null;
  fitScore: number | null;
  reason: string | null;
  /** What was written for it overnight. */
  kinds: MorningKind[];
  /** The posting itself, where the application is sent. */
  url?: string | null;
}

export interface MorningFile {
  v: 1;
  preparedAt: string;
  items: MorningItem[];
}

/** The list to show, or null when there's none or it's gone stale. */
export function currentMorning(file: MorningFile | null, now: Date = new Date()): MorningFile | null {
  if (!file || file.v !== 1 || !Array.isArray(file.items)) return null;
  const at = new Date(file.preparedAt).getTime();
  if (!Number.isFinite(at) || now.getTime() - at > MORNING_SHOWN_DAYS * 24 * 60 * 60 * 1000) return null;
  const items = file.items.filter((i) => i && typeof i.opportunityId === "string" && i.kinds.length > 0);
  return items.length > 0 ? { ...file, items } : null;
}

/**
 * Merges tonight's list into what's already there: new items first, the
 * still-fresh ones from earlier nights after, never the same job twice.
 */
export function mergeMorning(previous: MorningFile | null, tonight: MorningItem[], now: Date = new Date()): MorningFile {
  const kept = currentMorning(previous, now)?.items ?? [];
  const seen = new Set(tonight.map((i) => i.opportunityId));
  const items = [...tonight, ...kept.filter((i) => !seen.has(i.opportunityId))].slice(0, 6);
  return { v: 1, preparedAt: (tonight.length > 0 ? now : new Date(previous?.preparedAt ?? now)).toISOString(), items };
}

/** A link worth offering: http(s) only, never a javascript: or data: URL from a scraped page. */
export function postingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const KIND_LABEL: Record<MorningKind, string> = { resume: "Resume", cover: "Cover letter", note: "Note to the hiring manager" };

export function kindLabel(kind: MorningKind): string {
  return KIND_LABEL[kind];
}

/** "Written overnight" / "Written yesterday" / "Written on 21 Nov". */
export function preparedLabel(preparedAt: string, now: Date = new Date()): string {
  const at = new Date(preparedAt);
  if (Number.isNaN(at.getTime())) return "Written for you";
  const hours = (now.getTime() - at.getTime()) / 3_600_000;
  if (hours < 18) return "Written overnight";
  if (hours < 42) return "Written yesterday";
  return `Written on ${at.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/**
 * What the robot says under "Welcome back" on Home, in its own voice.
 * The morning list comes first because it's the thing to act on; failing
 * that, what the last search found; failing that, what happens next.
 */
export function homeGreeting(input: {
  isPro: boolean;
  /** Jobs on the morning list not applied to yet. */
  waiting: number;
  /** Jobs on the morning list in all. */
  ready: number;
  lastCheck: { when: string; newListings: number; strongNew: number } | null;
}): string {
  const { isPro, waiting, ready, lastCheck } = input;
  if (isPro && waiting > 0) {
    return waiting === 1 ? "I've got an application ready for you. It's just below." : `I've got ${waiting} applications ready for you. They're just below.`;
  }
  if (isPro && ready > 0) return "You've sent everything I wrote. I'll look for more tonight.";
  if (lastCheck) {
    const listings = lastCheck.newListings === 1 ? "1 new listing" : `${lastCheck.newListings} new listings`;
    const strong = lastCheck.strongNew === 0 ? "" : lastCheck.strongNew === 1 ? ", 1 strong match" : `, ${lastCheck.strongNew} strong matches`;
    const found = lastCheck.newListings === 0 ? "nothing new" : `${listings}${strong}`;
    return `I checked ${lastCheck.when} and found ${found}.${isPro ? " I'll look again tonight." : ""}`;
  }
  return isPro ? "I'll run your first nightly check tonight." : "Let's find your first matches.";
}
