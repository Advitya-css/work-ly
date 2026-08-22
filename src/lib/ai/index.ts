import { stubAIProvider } from "@/lib/ai/providers/stub";
import { openAICompatibleProvider } from "@/lib/ai/providers/openai-compatible";
import { googleGenAIProvider } from "@/lib/ai/providers/google-genai";
import type { AIProvider } from "@/lib/ai/types";

export type { AIProvider, AIMessage, AICompletionRequest, AICompletionResult } from "@/lib/ai/types";

function resolveProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "openai-compatible") return openAICompatibleProvider;
  if (provider === "google" || provider === "gemini") return googleGenAIProvider;
  return stubAIProvider;
}

export const aiProvider = resolveProvider();
