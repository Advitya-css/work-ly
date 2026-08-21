import type { ExtractedCareerProfile } from "@/lib/ai/resume-parser-types";

/** See resume-parser.ts for the full explanation of this abstraction. */
export interface ResumeParsingProvider {
  readonly name: "ai" | "heuristic";
  parseResume(resumeText: string): Promise<ExtractedCareerProfile>;
  extractCareerProfile(resumeText: string): Promise<ExtractedCareerProfile>;
}
