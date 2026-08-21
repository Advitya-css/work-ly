/** Shared display labels for job/analysis enums, used across the analyze-job pages. */

export const RECOMMENDATION_VARIANT = {
  APPLY_NOW: "success",
  APPLY: "success",
  STRETCH: "warning",
  LOW_PRIORITY: "outline",
  SKIP: "destructive",
} as const;

export const RECOMMENDATION_LABEL: Record<string, string> = {
  APPLY_NOW: "Apply now",
  APPLY: "Apply",
  STRETCH: "Stretch",
  LOW_PRIORITY: "Low priority",
  SKIP: "Skip",
};

export const GAP_TYPE_LABEL: Record<string, string> = {
  SKILL_GAP: "Skill gap",
  EXPERIENCE_GAP: "Experience gap",
  EVIDENCE_GAP: "Evidence gap",
  PORTFOLIO_GAP: "Portfolio gap",
  CREDENTIAL_GAP: "Credential gap",
  SENIORITY_GAP: "Seniority gap",
  POSITIONING_GAP: "Positioning gap",
};

export const WORK_MODE_LABEL: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "Onsite" };

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export const SENIORITY_LABEL: Record<string, string> = {
  ENTRY: "Entry",
  JUNIOR: "Junior",
  MID: "Mid",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
  EXECUTIVE: "Executive",
};

/** Score breakdown component keys, in the order they should be displayed. */
export const SCORE_COMPONENT_ORDER = [
  "skills",
  "experience",
  "education",
  "industryRelevance",
  "seniority",
  "location",
  "evidence",
] as const;

export const SCORE_COMPONENT_LABEL: Record<string, string> = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  industryRelevance: "Industry relevance",
  seniority: "Seniority",
  location: "Location & eligibility",
  evidence: "Evidence strength",
};

/** Priority breakdown component keys, in the order they should be displayed - see lib/priority/providers/stub.ts. */
export const PRIORITY_COMPONENT_ORDER = [
  "candidateFit",
  "careerValue",
  "competitiveness",
  "applicationEffort",
  "salary",
  "location",
  "careerProgression",
  "userPreferences",
] as const;

export const PRIORITY_COMPONENT_LABEL: Record<string, string> = {
  candidateFit: "Candidate fit",
  careerValue: "Career value",
  competitiveness: "Competitiveness",
  applicationEffort: "Application effort",
  salary: "Salary",
  location: "Location",
  careerProgression: "Career progression",
  userPreferences: "Your preferences",
};

export const COMPETITIVENESS_VARIANT: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  High: "success",
  Moderate: "warning",
  Low: "destructive",
};

export const OPPORTUNITY_STATUS_LABEL: Record<string, string> = {
  DISCOVERED: "Discovered",
  PREPARING: "Preparing",
  APPLIED: "Applied",
};

export const OPPORTUNITY_STATUS_VARIANT: Record<string, "default" | "warning" | "success" | "outline"> = {
  DISCOVERED: "outline",
  PREPARING: "warning",
  APPLIED: "success",
};
