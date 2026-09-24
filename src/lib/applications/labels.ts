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

const DEFAULT_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  PREPARING: "Preparing",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  FINAL_INTERVIEW: "Final interview",
  // "Offer", not "Got the job": an offer can still be negotiated or turned
  // down. Accepting it is a separate, explicit step on the application page.
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const FREELANCE_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  PREPARING: "Pre-Pitch",
  APPLIED: "Pitched / Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Audition / Discussions",
  FINAL_INTERVIEW: "Final Discussions",
  OFFER: "Offer / Booked",
  REJECTED: "Passed",
  WITHDRAWN: "Withdrawn",
};

export const APPLICATION_STATUS_LABEL = DEFAULT_STATUS_LABEL;

export function getApplicationStatusLabel(status: ApplicationStatus, isFreelanceMode: boolean = false): string {
  if (isFreelanceMode) {
    return FREELANCE_STATUS_LABEL[status];
  }
  return DEFAULT_STATUS_LABEL[status];
}

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
  OFFER: "Offer received",
  WITHDRAWN: "Withdrawn",
};

export function getApplicationOutcomeLabel(outcome: string, isFreelanceMode: boolean = false): string {
  if (isFreelanceMode && outcome === "OFFER") return "Offer / Booked";
  if (isFreelanceMode && outcome === "REJECTED") return "Passed";
  return APPLICATION_OUTCOME_LABEL[outcome] ?? outcome;
}

export const DATE_RANGE_LABEL: Record<string, string> = {
  ALL: "All time",
  LAST_30: "Last 30 days",
  LAST_90: "Last 90 days",
  LAST_365: "Last year",
};
