import type { EmploymentType, RequirementItem, SeniorityLevel, WorkMode } from "@/lib/db/types";

/**
 * Shape returned by job-description extraction, regardless of which
 * method produced it (real AI vs. the heuristic fallback - see
 * job-parser.ts). Every field is optional except `title` and
 * `requirements` - a posting missing salary or a deadline is normal;
 * fields simply come back null/empty rather than guessed at.
 */
export interface ExtractedJob {
  title: string | null;
  company: string | null;
  location: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  seniority: SeniorityLevel | null;
  description: string | null;
  requiredExperienceYears: number | null;
  preferredExperienceYears: number | null;
  education: string | null;
  industry: string | null;
  deadline: string | null;
  datePosted: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  /** The full checklist - every requirement line, tagged mandatory vs preferred. */
  requirements: RequirementItem[];
  extractionMethod: "ai" | "heuristic";
}
