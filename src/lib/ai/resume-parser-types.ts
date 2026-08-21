import type { SkillCategory, SkillEvidenceLevel } from "@/lib/db/types";

/**
 * Shape returned by resume extraction, regardless of which method produced
 * it (real AI vs. the heuristic fallback - see resume-parser.ts). Every
 * entry carries `isUncertain` so the review screen can flag anything that
 * needs a second look, per "never invent information; if something is
 * uncertain, mark it as uncertain."
 */
export interface ExtractedEducation {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  isUncertain: boolean;
}

export interface ExtractedExperience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  isUncertain: boolean;
}

export interface ExtractedProject {
  name: string;
  role?: string;
  description?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  isUncertain: boolean;
}

export interface ExtractedSkill {
  name: string;
  category: SkillCategory;
  evidenceLevel: SkillEvidenceLevel;
  isUncertain: boolean;
}

export interface ExtractedAchievement {
  title: string;
  description?: string;
  date?: string;
  isUncertain: boolean;
}

export interface ExtractedCertification {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  isUncertain: boolean;
}

/**
 * A competency the CV never states outright but that a role/achievement
 * reasonably implies (e.g. "President of Economics Club" -> Leadership).
 * Always rendered in the UI as "Potential transferable skill" - never
 * merged into the plain skills list, never presented as a proven fact.
 */
export interface ExtractedTransferableSkill {
  name: string;
  category: SkillCategory;
  rationale: string;
}

export interface ExtractedCareerProfile {
  headline?: string;
  summary?: string;
  /**
   * Years of experience implied by the dated roles on the CV, or null when
   * the dates could not be read. Null and 0 are deliberately different: null
   * means "not known from this document", 0 would be a claim that the person
   * has never worked - and the fit score treats those very differently.
   */
  yearsExperience?: number | null;
  education: ExtractedEducation[];
  experience: ExtractedExperience[];
  projects: ExtractedProject[];
  /** Includes languages (category "LANGUAGE") - there is no separate Language model. */
  skills: ExtractedSkill[];
  achievements: ExtractedAchievement[];
  certifications: ExtractedCertification[];
  transferableSkills: ExtractedTransferableSkill[];
  extractionMethod: "ai" | "heuristic";
}
