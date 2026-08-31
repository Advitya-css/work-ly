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

/**
 * A work value/culture preference inferred from the CV as a whole - the
 * kind of employer or mission the person's history suggests they gravitate
 * toward. Never a stated fact: `value` must be one of the WORK_VALUES
 * catalog keys (lib/values/value-graph.ts), and `evidence` must quote or
 * closely paraphrase something actually in the document. Grounding checks
 * this the same way it checks transferable-skill rationales - kept either
 * way, but counted toward the grounding ratio as a quality signal, since
 * (like a transferable skill) the value itself is expected not to appear
 * verbatim in the source.
 */
export interface ExtractedWorkValue {
  /** A WORK_VALUES catalog key, e.g. "sustainability_climate". */
  value: string;
  /** 0-1: how clearly the CV supports this, not how much Work-ly likes it. */
  confidence: number;
  /** What in the CV supports this inference - shown to the user as "why". */
  evidence: string;
}

export interface ExtractedCareerProfile {
  headline?: string;
  summary?: string;
  location?: string;
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
  /** Never invented for its own sake - empty when the CV doesn't clearly support any. */
  workValues: ExtractedWorkValue[];
  extractionMethod: "ai" | "heuristic";
}
