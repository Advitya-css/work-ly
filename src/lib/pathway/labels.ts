/** Shared display labels for the Career Pathway Engine - mirrors lib/jobs/labels.ts. */

export const ACTION_WINDOW_ORDER = ["DAYS_0_30", "DAYS_31_60", "DAYS_61_90"] as const;

export const ACTION_WINDOW_LABEL: Record<string, string> = {
  DAYS_0_30: "0–30 days",
  DAYS_31_60: "31–60 days",
  DAYS_61_90: "61–90 days",
};

export const ACTION_WINDOW_CAPTION: Record<string, string> = {
  DAYS_0_30: "Start here: quick wins that improve every application.",
  DAYS_31_60: "Build on the groundwork with substantive work.",
  DAYS_61_90: "Longer-running work, then start applying in earnest.",
};

export const ITEM_STATUS_LABEL: Record<string, string> = {
  PENDING: "To do",
  COMPLETED: "Done",
  SKIPPED: "Skipped",
};

export const ITEM_STATUS_VARIANT: Record<string, "outline" | "success" | "secondary"> = {
  PENDING: "outline",
  COMPLETED: "success",
  SKIPPED: "secondary",
};

export const DIFFICULTY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  Easy: "outline",
  Moderate: "warning",
  Hard: "destructive",
};
