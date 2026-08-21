import type { Application } from "@/lib/db/types";
import { wasSent } from "@/lib/applications/analytics";

/**
 * CAREER LEARNING - foundation only.
 *
 * This is the groundwork for learning which roles, companies, industries
 * and positioning actually work for a given user. What it deliberately is
 * NOT is a model. Every number below is a plain count or ratio over the
 * user's own applications; nothing is fitted, weighted or extrapolated.
 *
 * SAMPLE-SIZE DISCIPLINE
 *
 * The failure mode for a feature like this is confident nonsense: 1 of 1
 * research roles led to an interview, so "you interview best at research
 * roles!" That is worse than silence - it's a claim the user may act on,
 * built on a single data point, and it will look authoritative because it
 * came from software.
 *
 * So three gates, all of which must pass:
 *
 *   MIN_SENT       - enough total applications to say anything at all
 *   MIN_GROUP      - enough in a group to characterise that group
 *   MIN_COMPARISON - enough OUTSIDE it to claim the group is better
 *
 * Below those thresholds the UI shows how many more applications are
 * needed, which is honest and also tells the user what to do about it.
 */

const MIN_SENT = 8;
const MIN_GROUP = 3;
const MIN_COMPARISON = 3;
/// A group has to beat the rest by this many percentage points before it's
/// worth saying. Small differences on small samples are noise.
const MIN_MARGIN_POINTS = 15;

export interface Insight {
  /// Which attribute produced this - the axis a future model would learn on.
  dimension: "role" | "industry" | "company" | "location" | "fit_score" | "seniority";
  text: string;
  /// Always shown alongside the claim so the user can judge it themselves.
  sampleSize: number;
  supportingDetail: string;
}

export interface InsightsResult {
  insights: Insight[];
  /// True when there simply isn't enough data yet - the UI shows the
  /// counter below rather than an empty list, which would read as "we
  /// looked and found nothing interesting about you".
  notEnoughData: boolean;
  sentCount: number;
  needed: number;
}

interface Group {
  key: string;
  sent: Application[];
}

function groupBy(applications: Application[], pick: (a: Application) => string | null): Group[] {
  const map = new Map<string, Application[]>();
  for (const application of applications) {
    const raw = pick(application);
    if (!raw || !raw.trim()) continue;
    const key = raw.trim();
    map.set(key, [...(map.get(key) ?? []), application]);
  }
  return [...map.entries()].map(([key, sent]) => ({ key, sent }));
}

function interviewRate(applications: Application[]): number {
  if (applications.length === 0) return 0;
  return applications.filter((a) => a.reachedInterviewAt != null).length / applications.length;
}

/**
 * Finds the single group that most outperforms everything else on
 * interview rate - but only if every gate passes. Returns null far more
 * often than not, which is correct behaviour, not a bug.
 */
function bestGroupInsight(
  sent: Application[],
  pick: (a: Application) => string | null,
  dimension: Insight["dimension"],
  phrase: (key: string, rate: number) => string,
): Insight | null {
  const groups = groupBy(sent, pick).filter((g) => g.sent.length >= MIN_GROUP);
  if (groups.length === 0) return null;

  let best: { group: Group; rate: number; restRate: number } | null = null;

  for (const group of groups) {
    const rest = sent.filter((a) => !group.sent.includes(a));
    if (rest.length < MIN_COMPARISON) continue;

    const rate = interviewRate(group.sent);
    const restRate = interviewRate(rest);
    if (rate - restRate < MIN_MARGIN_POINTS / 100) continue;

    if (!best || rate - restRate > best.rate - best.restRate) {
      best = { group, rate, restRate };
    }
  }

  if (!best) return null;

  const groupPct = Math.round(best.rate * 100);
  const restPct = Math.round(best.restRate * 100);
  return {
    dimension,
    text: phrase(best.group.key, best.rate),
    sampleSize: best.group.sent.length,
    supportingDetail: `${groupPct}% interview rate across ${best.group.sent.length} application${
      best.group.sent.length === 1 ? "" : "s"
    }, against ${restPct}% for everything else.`,
  };
}

/**
 * Does a higher Candidate Fit at apply time actually correlate with getting
 * interviews for THIS user? Reported as a comparison of means, not a
 * correlation coefficient - the sample sizes involved don't justify one.
 */
function fitScoreInsight(sent: Application[]): Insight | null {
  const scored = sent.filter((a) => a.fitScoreAtApply != null);
  if (scored.length < MIN_SENT) return null;

  const withInterview = scored.filter((a) => a.reachedInterviewAt != null);
  const without = scored.filter((a) => a.reachedInterviewAt == null);
  if (withInterview.length < MIN_GROUP || without.length < MIN_COMPARISON) return null;

  const mean = (list: Application[]) =>
    Math.round(list.reduce((sum, a) => sum + (a.fitScoreAtApply ?? 0), 0) / list.length);

  const withMean = mean(withInterview);
  const withoutMean = mean(without);
  if (withMean - withoutMean < 8) return null;

  return {
    dimension: "fit_score",
    text: "Roles where Workly scored your fit higher are the ones getting you interviews.",
    sampleSize: scored.length,
    supportingDetail: `Average Candidate Fit was ${withMean}/100 for applications that reached interview, versus ${withoutMean}/100 for those that didn't.`,
  };
}

export function buildInsights(applications: Application[]): InsightsResult {
  const sent = applications.filter(wasSent);

  if (sent.length < MIN_SENT) {
    return {
      insights: [],
      notEnoughData: true,
      sentCount: sent.length,
      needed: MIN_SENT - sent.length,
    };
  }

  const insights = [
    bestGroupInsight(
      sent,
      (a) => a.roleTitle,
      "role",
      (key) => `You receive the most interviews from ${key} roles.`,
    ),
    bestGroupInsight(
      sent,
      (a) => a.industry,
      "industry",
      (key) => `${key} is your strongest industry so far.`,
    ),
    bestGroupInsight(
      sent,
      (a) => a.company,
      "company",
      (key) => `Applications to ${key} have gone further than average.`,
    ),
    bestGroupInsight(
      sent,
      (a) => a.location ?? a.country,
      "location",
      (key) => `Roles in ${key} are converting better than elsewhere.`,
    ),
    fitScoreInsight(sent),
  ].filter((insight): insight is Insight => insight !== null);

  return { insights, notEnoughData: false, sentCount: sent.length, needed: 0 };
}

/** Exposed so the UI can explain the thresholds rather than just enforcing them. */
export const INSIGHT_THRESHOLDS = { MIN_SENT, MIN_GROUP, MIN_COMPARISON, MIN_MARGIN_POINTS };
