import type { AICompletionRequest, AICompletionResult, AIProvider } from "@/lib/ai/types";

/**
 * No-op AI provider. Returns a clearly-labeled placeholder instead of a
 * real completion so nothing downstream can mistake stub output for a
 * real AI judgment - consistent with never presenting invented content as
 * fact (see product principles in the project brief).
 */
export const stubAIProvider: AIProvider = {
  name: "stub",
  async complete(_request: AICompletionRequest): Promise<AICompletionResult> {
    throw new Error(
      "AI features are not enabled in this phase (AI_PROVIDER=stub). " +
        "Set AI_PROVIDER, AI_API_KEY, AI_BASE_URL and AI_MODEL in .env to enable a real provider.",
    );
  },
};
