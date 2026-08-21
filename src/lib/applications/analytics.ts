import type { Application } from "@/lib/db/types";

/**
 * Outcome analytics.
 *
 * THE ONE THING THAT MATTERS HERE: rates are computed from the milestone
 * timestamps (`reachedInterviewAt`, `reachedOfferAt`), never from the
 * current `status` column.
 *
 * Counting rows whose status is currently INTERVIEW would be wrong in the
 * most common case there is - you interview, then get rejected. Status is
 * now REJECTED, but the interview absolutely happened. Reading status would
 * quietly report an interview rate of 0% to someone who has been
 * interviewing steadily, which is worse than showing nothing at all.
 */

export type DateRangeKey = "ALL" | "LAST_30" | "LAST_90" | "LAST_365";

export interface AnalyticsFilters {
  role?: string;
  industry?: string;
  company?: string;
  location?: string;
  dateRange?: DateRangeKey;
}

export interface AnalyticsSummary {
  /// Applications actually sent - SAVED and PREPARING don't count, since
  /// nothing has been submitted yet and including them would deflate every
  /// rate below.
  applications: number;
  interviews: number;
  offers: number;
  rejections: number;
  /// Still live: sent, not yet rejected or withdrawn.
  inProgress: number;
  /// null rather than 0 when there's nothing to divide by - "no data" and
  /// "0%" mean very different things and shouldn't render the same.
  interviewRate: number | null;
  offerRate: number | null;
  /// Offers as a share of interviews, not of applications.
  offerPerInterviewRate: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_DAYS: Record<Exclude<DateRangeKey, "ALL">, number> = {
  LAST_30: 30,
  LAST_90: 90,
  LAST_365: 365,
};

/** An application counts as "sent" once it has left the pre-submission stages. */
export function wasSent(application: Application): boolean {
  return application.status !== "SAVED" && application.status !== "PREPARING";
}

function matchesText(value: string | null, filter: string | undefined): boolean {
  if (!filter) return true;
  if (!value) return false;
  return value.toLowerCase().includes(filter.toLowerCase());
}

export function applyFilters(
  applications: Application[],
  filters: AnalyticsFilters,
  /// Injected rather than read from the clock so the same input always
  /// produces the same output, which keeps this testable.
  now: Date = new Date(),
): Application[] {
  const cutoff =
    filters.dateRange && filters.dateRange !== "ALL"
      ? new Date(now.getTime() - RANGE_DAYS[filters.dateRange] * DAY_MS)
      : null;

  return applications.filter((application) => {
    if (!matchesText(application.roleTitle, filters.role)) return false;
    if (!matchesText(application.industry, filters.industry)) return false;
    if (!matchesText(application.company, filters.company)) return false;
    if (
      filters.location &&
      !matchesText(application.location, filters.location) &&
      !matchesText(application.country, filters.location)
    ) {
      return false;
    }
    if (cutoff) {
      const when = application.dateApplied ?? application.createdAt;
      if (new Date(when).getTime() < cutoff.getTime()) return false;
    }
    return true;
  });
}

export function summarize(applications: Application[]): AnalyticsSummary {
  const sent = applications.filter(wasSent);

  const interviews = sent.filter((a) => a.reachedInterviewAt != null).length;
  const offers = sent.filter((a) => a.reachedOfferAt != null).length;
  const rejections = sent.filter((a) => a.outcome === "REJECTED").length;
  const inProgress = sent.filter((a) => a.outcome === "PENDING").length;

  const rate = (numerator: number, denominator: number) =>
    denominator === 0 ? null : Math.round((numerator / denominator) * 100);

  return {
    applications: sent.length,
    interviews,
    offers,
    rejections,
    inProgress,
    interviewRate: rate(interviews, sent.length),
    offerRate: rate(offers, sent.length),
    offerPerInterviewRate: rate(offers, interviews),
  };
}

/** Distinct values present in the data, for populating filter dropdowns. */
export function filterOptions(applications: Application[]) {
  const collect = (pick: (a: Application) => string | null) =>
    [...new Set(applications.map(pick).filter((v): v is string => Boolean(v && v.trim())))].sort();

  return {
    roles: collect((a) => a.roleTitle),
    industries: collect((a) => a.industry),
    companies: collect((a) => a.company),
    locations: collect((a) => a.location ?? a.country),
  };
}
