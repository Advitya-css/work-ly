import type { ExtractedJob } from "@/lib/ai/job-parser-types";

/** See job-parser.ts for the full explanation of this abstraction. */
export interface JobParsingProvider {
  readonly name: "ai" | "heuristic";
  parseJob(jobText: string): Promise<ExtractedJob>;
}
