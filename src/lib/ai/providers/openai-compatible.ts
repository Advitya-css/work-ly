import "server-only";
import { redact } from "@/lib/errors";
import type { AICompletionRequest, AICompletionResult, AIProvider } from "@/lib/ai/types";

/**
 * Works with any OpenAI-compatible chat completions endpoint. Known-good
 * configurations (set via AI_BASE_URL + AI_MODEL in .env):
 *
 *   OpenAI      https://api.openai.com/v1
 *   OpenRouter  https://openrouter.ai/api/v1              model: "google/gemini-3.5-flash-lite"
 *   Google      https://generativelanguage.googleapis.com/v1beta/openai/
 *                                                         model: "gemini-3.5-flash-lite"
 *
 * Note the model-name difference: OpenRouter namespaces by vendor
 * ("google/..."), Google's own OpenAI-compatibility endpoint does not.
 * Pointing a Google AI Studio key at OpenRouter's URL (or vice versa) is
 * the most common misconfiguration - it fails with a 401/404 from the
 * endpoint rather than anything Workly can diagnose for you, so the
 * request logging below prints the resolved config once per process.
 */

/** Logged once per process so a misconfigured endpoint is obvious in the server output. */
let loggedConfig = false;

/**
 * A hung upstream request used to block a parse indefinitely - nothing here
 * ever gave up on it. 20s is generous for a single completion; three
 * attempts means a genuinely broken endpoint fails within about a minute
 * instead of never, and callers fall back to the heuristic parser promptly
 * either way.
 */
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

/** 429 (rate limited) and 5xx (upstream trouble) are worth a retry. 4xx otherwise (bad key, bad request) will not fix itself. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const openAICompatibleProvider: AIProvider = {
  name: "openai-compatible",
  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.AI_MODEL ?? "gemini-3.5-flash-lite";

    if (!apiKey) {
      throw new Error("AI_API_KEY is required when AI_PROVIDER is not 'stub'.");
    }

    if (!loggedConfig) {
      loggedConfig = true;
      // Never log the key itself - only enough to confirm one is present.
      console.info(`[workly:ai] live AI calls enabled: endpoint=${baseUrl} model=${model} key=***${apiKey.slice(-4)}`);
    }

    const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body = JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      ...(request.responseSchema
        ? { response_format: { type: "json_schema", json_schema: request.responseSchema } }
        : {}),
    });

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        lastError = error;
        const isTimeout = error instanceof Error && error.name === "TimeoutError";
        const isNetworkFailure = error instanceof TypeError;
        if ((isTimeout || isNetworkFailure) && attempt < MAX_ATTEMPTS) {
          console.warn(
            `[workly:ai] ${isTimeout ? "request timed out" : "network error"} against ${baseUrl} ` +
              `(attempt ${attempt}/${MAX_ATTEMPTS}), retrying`,
          );
          await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        throw error;
      }

      if (!response.ok) {
        const responseBody = await response.text();
        console.error(
          `[workly:ai] request failed ${response.status} against ${baseUrl} (model=${model}, ` +
            // Redacted: an error body from a misconfigured proxy or gateway
            // can echo back the very Authorization header/key that was sent.
            `attempt ${attempt}/${MAX_ATTEMPTS}): ${redact(responseBody.slice(0, 500))}`,
        );
        if (isRetryableStatus(response.status) && attempt < MAX_ATTEMPTS) {
          lastError = new Error(`AI provider request failed (${response.status}): ${responseBody}`);
          await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        throw new Error(`AI provider request failed (${response.status}): ${responseBody}`);
      }

      const data = await response.json();
      const content: string = data.choices?.[0]?.message?.content ?? "";

      let parsed: unknown;
      if (request.responseSchema) {
        try {
          parsed = JSON.parse(content);
        } catch {
          // Leave `parsed` undefined - caller should treat this as a failed
          // extraction. Logged because the callers fall back silently, and a
          // model that ignores response_format (structured-output support
          // varies by endpoint and model) otherwise looks identical to
          // "the AI provider was never configured at all".
          console.warn(
            `[workly:ai] model=${model} did not return valid JSON despite a response schema, ` +
              `falling back to heuristic extraction. First 200 chars: ${content.slice(0, 200)}`,
          );
        }
      }

      return { content, parsed };
    }

    // Every attempt failed with a retryable error.
    throw lastError instanceof Error ? lastError : new Error("AI provider request failed after retries.");
  },
};
