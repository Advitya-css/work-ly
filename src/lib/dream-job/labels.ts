/** Shared display labels for Dream Job / Gap Engine enums - mirrors lib/jobs/labels.ts. */

export const GAP_IMPACT_VARIANT: Record<string, "destructive" | "warning" | "outline"> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "outline",
};

export const GAP_IMPACT_LABEL: Record<string, string> = {
  HIGH: "High impact",
  MEDIUM: "Medium impact",
  LOW: "Low impact",
};

export const GAP_DIFFICULTY_LABEL: Record<string, string> = {
  HIGH: "High difficulty",
  MEDIUM: "Medium difficulty",
  LOW: "Low difficulty",
};

export const IMPROVEMENT_TIER_LABEL: Record<string, string> = {
  HIGH: "Highest impact",
  MEDIUM: "Medium impact",
  LOW: "Low impact",
};

export const IMPROVEMENT_TIER_VARIANT: Record<string, "destructive" | "warning" | "outline"> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "outline",
};

export const CV_IMPROVEMENT_AREA_LABEL: Record<string, string> = {
  missing_information: "Missing information",
  weak_evidence: "Weak evidence",
  poor_ordering: "Poor ordering",
  generic_language: "Generic language",
  unquantified_achievements: "Unquantified achievements",
  missing_experience: "Missing relevant experience",
};
