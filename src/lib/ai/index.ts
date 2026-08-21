import { stubAIProvider } from "@/lib/ai/providers/stub";
import { openAICompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import type { AIProvider } from "@/lib/ai/types";

export type { AIProvider, AIMessage, AICompletionRequest, AICompletionResult } from "@/lib/ai/types";

function resolveProvider(): AIProvider {
  return process.env.AI_PROVIDER === "openai-compatible" ? openAICompatibleProvider : stubAIProvider;
}

export const aiProvider = resolveProvider();
