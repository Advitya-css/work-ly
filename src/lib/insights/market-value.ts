import type { DiscoveredJob } from "@/lib/db/types";
import { titleIsRelevant } from "@/lib/discovery/relevance";

/**
 * YOUR MARKET VALUE - what employers are actually offering for roles like
 * yours, counted from the listings Work-ly has found for you.
 *
 * Only salaries an employer stated (the Adzuna adapter drops its own
 * estimates), only one currency at a time, and only listings relevant to
 * the user - either the title is in their field or Work-ly scored them as
 * worth applying to. No model, no benchmark data from elsewhere: every
 * number traces back to real postings, and the sample size is always shown.
 */

export const MIN_SALARY_SAMPLE = 5;
const WINDOW_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SalaryListing {
  title: string;
  company: string | null;
  min: number;
  max: number;
  url: string | null;
}

export interface MarketValue {
  currency: string | null;
  /** Relevant listings with a stated salary in `currency`. */
  sample: number;
  /** Quartiles of the listings' midpoints - null below MIN_SALARY_SAMPLE. */
  low: number | null;
  median: number | null;
  high: number | null;
  /** Median for the roles Work-ly rated Apply now / Strong, when there are enough of them. */
  strongMatchMedian: number | null;
  strongMatchSample: number;
  /** The best-paying relevant listings, highest first. */
  topPaying: SalaryListing[];
  sinceDays: number;
}

export interface RisingSkill {
  skill: string;
  recentShare: number;
  earlierShare: number;
  recentCount: number;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

function when(job: Pick<DiscoveredJob, "postedAt" | "discoveredAt">): number {
  return new Date(job.postedAt ?? job.discoveredAt).getTime();
}

export function isRelevantListing(job: DiscoveredJob, targets: (string | null | undefined)[]): boolean {
  if (job.isDismissed || job.duplicateOfId) return false;
  if (job.recommendation === "APPLY_NOW" || job.recommendation === "APPLY") return true;
  return targets.some((t) => t?.trim()) && titleIsRelevant(job.title, targets);
}

export function buildMarketValue(
  jobs: DiscoveredJob[],
  targets: (string | null | undefined)[],
  now = Date.now(),
): MarketValue {
  const recent = jobs.filter((job) => now - when(job) <= WINDOW_DAYS * DAY_MS && isRelevantListing(job, targets));
  const withPay = recent.filter(
    (job) =>
      job.salaryCurrency &&
      (job.salaryMin != null || job.salaryMax != null) &&
      // A max below the min is a data error, not a range.
      !(job.salaryMin != null && job.salaryMax != null && job.salaryMax < job.salaryMin),
  );

  // The currency most of them are paid in; mixing currencies would be meaningless.
  const counts = new Map<string, number>();
  for (const job of withPay) counts.set(job.salaryCurrency!, (counts.get(job.salaryCurrency!) ?? 0) + 1);
  const currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const listings = withPay
    .filter((job) => job.salaryCurrency === currency)
    .map((job) => {
      const min = job.salaryMin ?? job.salaryMax!;
      const max = job.salaryMax ?? job.salaryMin!;
      return { job, min, max, mid: (min + max) / 2 };
    });

  const mids = listings.map((l) => l.mid).sort((a, b) => a - b);
  const enough = mids.length >= MIN_SALARY_SAMPLE;
  const strong = listings.filter((l) => l.job.recommendation === "APPLY_NOW" || l.job.recommendation === "APPLY");

  return {
    currency,
    sample: listings.length,
    low: enough ? quantile(mids, 0.25) : null,
    median: enough ? quantile(mids, 0.5) : null,
    high: enough ? quantile(mids, 0.75) : null,
    strongMatchMedian: strong.length >= 3 ? median(strong.map((l) => l.mid)) : null,
    strongMatchSample: strong.length,
    topPaying: [...listings]
      .sort((a, b) => b.max - a.max)
      .slice(0, 3)
      .map((l) => ({ title: l.job.title, company: l.job.company, min: l.min, max: l.max, url: l.job.sourceUrl })),
    sinceDays: WINDOW_DAYS,
  };
}

function skillsOf(job: DiscoveredJob): string[] {
  const all = [...(job.requiredSkills ?? []), ...(job.preferredSkills ?? [])]
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 1 && s.length <= 30);
  return Array.from(new Set(all));
}

/**
 * Skills asked for noticeably more often in the last 30 days than in the
 * 30-90 days before, among relevant listings. Needs enough postings in
 * both windows to mean anything; returns [] otherwise.
 */
export function risingSkills(
  jobs: DiscoveredJob[],
  targets: (string | null | undefined)[],
  now = Date.now(),
): RisingSkill[] {
  const relevant = jobs.filter((job) => isRelevantListing(job, targets));
  const recent = relevant.filter((job) => now - when(job) <= 30 * DAY_MS);
  const earlier = relevant.filter((job) => {
    const age = now - when(job);
    return age > 30 * DAY_MS && age <= 90 * DAY_MS;
  });
  if (recent.length < 8 || earlier.length < 8) return [];

  const share = (set: DiscoveredJob[]) => {
    const counts = new Map<string, number>();
    for (const job of set) for (const s of skillsOf(job)) counts.set(s, (counts.get(s) ?? 0) + 1);
    return counts;
  };
  const recentCounts = share(recent);
  const earlierCounts = share(earlier);

  return [...recentCounts.entries()]
    .map(([skill, count]) => ({
      skill,
      recentCount: count,
      recentShare: count / recent.length,
      earlierShare: (earlierCounts.get(skill) ?? 0) / earlier.length,
    }))
    .filter((r) => r.recentCount >= 3 && r.recentShare - r.earlierShare >= 0.1)
    .sort((a, b) => b.recentShare - b.earlierShare - (a.recentShare - a.earlierShare))
    .slice(0, 5);
}

/** "₹18,00,000" / "$120,000" - Indian digit grouping for INR. */
export function formatMoney(amount: number, currency: string | null): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: currency ? "currency" : "decimal",
      currency: currency ?? undefined,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency ?? ""} ${Math.round(amount).toLocaleString(locale)}`.trim();
  }
}
