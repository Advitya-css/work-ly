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
