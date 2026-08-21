import type { ApplicationStatus } from "@/lib/db/types";

/** Shared display labels for the application pipeline. */

/// Kanban column order. REJECTED and WITHDRAWN sit at the end as terminal
/// states rather than being hidden - a closed application is still part of
/// the picture, and hiding it makes the board lie about volume.
export const PIPELINE_COLUMNS: ApplicationStatus[] = [
  "SAVED",
  "PREPARING",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  PREPARING: "Preparing",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  FINAL_INTERVIEW: "Final interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const APPLICATION_STATUS_VARIANT: Record<
  ApplicationStatus,
  "outline" | "secondary" | "default" | "warning" | "success" | "destructive"
> = {
  SAVED: "outline",
  PREPARING: "outline",
  APPLIED: "secondary",
  ASSESSMENT: "warning",
  INTERVIEW: "warning",
  FINAL_INTERVIEW: "warning",
  OFFER: "success",
  REJECTED: "destructive",
  WITHDRAWN: "secondary",
};

export const APPLICATION_OUTCOME_LABEL: Record<string, string> = {
  PENDING: "In progress",
  REJECTED: "Rejected",
  OFFER: "Offer",
  WITHDRAWN: "Withdrawn",
};

export const DATE_RANGE_LABEL: Record<string, string> = {
  ALL: "All time",
  LAST_30: "Last 30 days",
  LAST_90: "Last 90 days",
  LAST_365: "Last year",
};
