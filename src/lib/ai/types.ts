/**
 * AI provider abstraction. Everything in the product that touches a model
 * (resume parsing, match explanations, gap analysis, pathway generation -
 * all later phases) should go through this interface, never call a vendor
 * SDK directly from app code.
 *
 * Swap providers via AI_PROVIDER + AI_API_KEY/AI_BASE_URL/AI_MODEL - no
 * code changes. Phase 1 ships only the stub implementation; no AI feature
 * is wired up to real app code yet.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  /** JSON schema the response should conform to, for structured extraction tasks. */
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  /**
   * "high" runs the call on the stronger model (AI_QUALITY_MODEL), used
   * only for the few Pro features where quality decides whether a user
   * keeps paying. Everything else stays on the standard model (AI_MODEL).
   * If the stronger model is busy, slow or unavailable, the call falls
   * back to the standard model, so a Pro user never gets an error instead.
   */
  quality?: "standard" | "high";
}

export interface AICompletionResult {
  content: string;
  /** Present when responseSchema was provided and parsing succeeded. */
  parsed?: unknown;
}

export interface AIProvider {
  readonly name: string;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
