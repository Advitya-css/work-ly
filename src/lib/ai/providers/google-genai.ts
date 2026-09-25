import "server-only";
import type { AICompletionRequest, AICompletionResult, AIProvider } from "@/lib/ai/types";

let loggedConfig = false;
// One call gets up to 45s, and all attempts together stay inside 50s so
// the 60s function limit is never hit. The old 22s-per-attempt cap cut off
// long generations (a tailored resume, a full strategy) that routinely take
// 20-30s - they timed out, retried, and timed out again, and the user saw
// "Couldn't build... try again" every time. A timeout is no longer retried
// (it would only repeat the same slow call); quick failures (429, 5xx,
// network) are, while time remains.
const REQUEST_TIMEOUT_MS = 45_000;
const TOTAL_BUDGET_MS = 50_000;
const MIN_RETRY_WINDOW_MS = 8_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toGeminiSchema(schema: any): any {
  if (!schema) return undefined;
  
  if (Array.isArray(schema.type)) {
    const isNullable = schema.type.includes("null");
    const mainType = schema.type.find((t: string) => t !== "null");
    const result = toGeminiSchema({ ...schema, type: mainType });
    if (isNullable) result.nullable = true;
    return result;
  }

  const result: any = {};
  if (schema.type) {
    result.type = String(schema.type).toUpperCase();
  }
  if (schema.properties) {
    result.properties = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      result.properties[k] = toGeminiSchema(v);
    }
  }
  if (schema.items) {
    result.items = toGeminiSchema(schema.items);
  }
  if (schema.enum) {
    result.enum = schema.enum.filter((e: any) => e !== null);
    // If enum included null, Gemini handles it via nullable: true if we translated it earlier.
    // If it was just an enum with null, ensure we flag nullable.
    if (schema.enum.includes(null)) {
      result.nullable = true;
    }
  }
  if (schema.required) {
    result.required = schema.required;
  }
  if (schema.description) {
    result.description = schema.description;
  }
  return result;
}

export const googleGenAIProvider: AIProvider = {
  name: "google-genai",
  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const primaryApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    const fallbackApiKey = process.env.AI_FALLBACK_API_KEY?.trim() || (primaryApiKey as string);
    const model = process.env.AI_MODEL ?? "gemini-3.5-flash-lite";

    if (!primaryApiKey) {
      throw new Error("A Google API Key (GOOGLE_GENERATIVE_AI_API_KEY, GOOGLE_API_KEY, or AI_API_KEY) is required for Google GenAI.");
    }

    if (!loggedConfig) {
      loggedConfig = true;
      console.info(`[workly:ai] live Google GenAI calls enabled: model=${model} key=***${primaryApiKey.slice(-4)}`);
    }

    // Models to try in order. When one is out of quota (429), overloaded
    // (5xx) or no longer exists (404 - Google retires model names), the next
    // is tried while time remains. The "-latest" aliases are kept current by
    // Google, so the chain doesn't rot when a specific version is retired.
    const chain = Array.from(
      new Set(
        [model, process.env.AI_FALLBACK_MODEL?.trim(), "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash"].filter(
          (m): m is string => Boolean(m),
        ),
      ),
    );
    let modelIndex = 0;
    const urlFor = (m: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
    const currentUrl = () => urlFor(chain[modelIndex], modelIndex === 0 ? primaryApiKey : fallbackApiKey);
    
    // Map messages
    let systemInstruction;
    const contents = [];
    
    for (const m of request.messages) {
      if (m.role === "system") {
        systemInstruction = m.content;
      } else {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        });
      }
    }

    const body = JSON.stringify({
      system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        ...(request.responseSchema
          ? {
              responseMimeType: "application/json",
              responseSchema: toGeminiSchema(request.responseSchema.schema || request.responseSchema)
            }
          : {}),
      },
    });

    let lastError: unknown;
    const deadline = Date.now() + TOTAL_BUDGET_MS;
    const maxAttempts = MAX_ATTEMPTS + chain.length - 1;
    const canRetry = (attempt: number) => attempt < maxAttempts && deadline - Date.now() > MIN_RETRY_WINDOW_MS;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response;
      try {
        response = await fetch(currentUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(Math.max(1_000, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()))),
        });
      } catch (error) {
        lastError = error;
        const isTimeout = error instanceof Error && error.name === "TimeoutError";
        const isNetworkFailure = error instanceof TypeError;
        if (isTimeout) console.warn(`[workly:ai] model=${chain[modelIndex]} took longer than the time allowed (attempt ${attempt})`);
        if (!isTimeout && isNetworkFailure && canRetry(attempt)) {
          console.warn(`[workly:ai] network error (attempt ${attempt}/${MAX_ATTEMPTS}), retrying`);
          await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        throw error;
      }

      if (!response.ok) {
        const responseBody = await response.text();
        console.error(`[workly:ai] request failed ${response.status} against Google API (model=${chain[modelIndex]}, attempt ${attempt}/${maxAttempts}): ${responseBody.slice(0, 500)}`);
        const modelProblem =
          response.status === 429 || response.status >= 500 || response.status === 404 || (response.status === 400 && /model/i.test(responseBody));
        if (modelProblem && modelIndex < chain.length - 1 && canRetry(attempt)) {
          modelIndex++;
          console.warn(`[workly:ai] switching to ${chain[modelIndex]} after ${response.status}`);
          lastError = new Error(`AI provider request failed (${response.status})`);
          continue;
        }
        if (isRetryableStatus(response.status) && canRetry(attempt)) {
          lastError = new Error(`AI provider request failed (${response.status}): ${responseBody}`);
          await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        throw new Error(`AI provider request failed (${response.status}): ${responseBody}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      let parsed: unknown;
      if (request.responseSchema) {
        try {
          parsed = JSON.parse(content);
        } catch {
          console.warn(`[workly:ai] model=${chain[modelIndex]} did not return valid JSON despite a response schema. First 200 chars: ${content.slice(0, 200)}`);
        }
      }

      return { content, parsed };
    }

    throw lastError instanceof Error ? lastError : new Error("AI provider request failed after retries.");
  },
};
