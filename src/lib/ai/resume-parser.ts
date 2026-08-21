import "server-only";
import { aiResumeParsingProvider } from "@/lib/ai/providers/resume-ai";
import { heuristicResumeParsingProvider } from "@/lib/ai/providers/resume-heuristic";

export type { ResumeParsingProvider } from "@/lib/ai/resume-parser-provider-type";
export type * from "@/lib/ai/resume-parser-types";

/**
 * Dedicated abstraction for turning resume text into structured data -
 * separate from the general chat-completion AIProvider (lib/ai/index.ts)
 * because resume parsing has its own two-step shape:
 *
 *  - parseResume()          - the raw extraction pass (asks the model, or
 *                              the heuristic fallback, for everything it
 *                              can find, with minimal massaging)
 *  - extractCareerProfile() - validates and normalizes that into the exact
 *                              shape the rest of the app persists (dates
 *                              parsed, enums coerced, nothing silently
 *                              invented to fill a gap)
 *
 * Two implementations exist: `providers/resume-ai.ts` (real, calls the
 * OpenAI-compatible AIProvider with a constrained JSON prompt) and
 * `providers/resume-heuristic.ts` (pure text/section parsing, no model
 * call). Unlike the general AIProvider stub, resume parsing always
 * returns a best-effort result rather than throwing - CV upload is a real
 * Phase 2 feature, not a placeholder for later - so when no AI provider
 * is configured, every extracted field is simply marked
 * `isUncertain: true` and the result records `extractionMethod:
 * "heuristic"` so the UI can say so honestly.
 */
function resolveProvider() {
  return process.env.AI_PROVIDER === "openai-compatible" && process.env.AI_API_KEY
    ? aiResumeParsingProvider
    : heuristicResumeParsingProvider;
}

export const resumeParsingProvider = resolveProvider();
