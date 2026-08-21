import "server-only";
import { aiJobParsingProvider } from "@/lib/ai/providers/job-ai";
import { heuristicJobParsingProvider } from "@/lib/ai/providers/job-heuristic";

export type { JobParsingProvider } from "@/lib/ai/job-parser-provider-type";
export type * from "@/lib/ai/job-parser-types";

/**
 * Mirrors resume-parser.ts: a dedicated extraction abstraction with two
 * implementations, real AI (providers/job-ai.ts, validated against
 * lib/validations/job-extraction.ts before anything is trusted) and a
 * heuristic fallback (providers/job-heuristic.ts, pure pattern matching,
 * no model call) so /analyze-job works out of the box without an API key.
 */
function resolveProvider() {
  return process.env.AI_PROVIDER === "openai-compatible" && process.env.AI_API_KEY
    ? aiJobParsingProvider
    : heuristicJobParsingProvider;
}

export const jobParsingProvider = resolveProvider();
