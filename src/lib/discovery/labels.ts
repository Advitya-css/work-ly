import {
  IconApplyNow,
  IconLowPriority,
  IconStretch,
  IconStrong,
} from "@/components/icons";
import type { JobSourceKind, JobSourceStatus } from "@/lib/db/types";

/** Shared display labels for the discovery engine. */

export const SOURCE_KIND_LABEL: Record<JobSourceKind, string> = {
  COMPANY_CAREER: "Company careers board",
  PUBLIC_JOB_BOARD: "Public job board",
  GOVERNMENT: "Government",
  UNIVERSITY: "University",
  EMPLOYER_FEED: "Employer feed",
  API_PROVIDER: "Licensed API",
  MANUAL_IMPORT: "Pasted by you",
  DEMO: "Demo (fictional)",
};

export const SOURCE_STATUS_LABEL: Record<JobSourceStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Off",
  NEEDS_CREDENTIALS: "Needs setup",
  ERROR: "Error",
};

export const SOURCE_STATUS_VARIANT: Record<
  JobSourceStatus,
  "success" | "outline" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  DISABLED: "outline",
  NEEDS_CREDENTIALS: "warning",
  ERROR: "destructive",
};

/**
 * The four discovery bands.
 *
 * These used to be labelled with emoji. Emoji were a poor fit for three
 * reasons: they render as a different picture on every operating system, they
 * cannot take the colour of the band they belong to, and a screen reader
 * announces them by their Unicode name, so a bucket read out as "fire, Apply
 * Now". Each band now has a drawn icon whose SHAPE carries the meaning, so it
 * still works when colour is unavailable.
 */
export const BUCKETS = [
  { key: "applyNow", icon: IconApplyNow, label: "Apply Now", tone: "text-destructive" },
  { key: "strong", icon: IconStrong, label: "Strong", tone: "text-success" },
  { key: "stretch", icon: IconStretch, label: "Stretch", tone: "text-warning" },
  { key: "lowPriority", icon: IconLowPriority, label: "Low Priority", tone: "text-muted-foreground" },
] as const;

export type BucketKey = (typeof BUCKETS)[number]["key"];

/**
 * A source's last error, in words a user can act on. Only recognised shapes
 * are shown - a raw network error can carry the request URL, and for
 * licensed APIs that URL contains the API key.
 */
export function sourceErrorHint(errorMessage: string | null | undefined): string | null {
  if (!errorMessage) return null;
  const http = /HTTP (\d{3})/.exec(errorMessage);
  if (http) {
    const code = Number(http[1]);
    if (code === 401 || code === 403) return "The API key was rejected. Check it in the hosting settings.";
    if (code === 404) return "This board or endpoint doesn't exist (HTTP 404).";
    if (code === 429) return "Rate-limited by the provider. It will retry on the next run.";
    if (code === 400) return "The provider rejected the search (HTTP 400).";
    if (code >= 500) return `The provider had an outage (HTTP ${code}).`;
    return `The provider returned HTTP ${code}.`;
  }
  if (/abort|timed? ?out/i.test(errorMessage)) return "The provider took too long to answer.";
  if (/^Needs: /.test(errorMessage)) return errorMessage;
  return "The last run failed. It will retry on the next run.";
}
