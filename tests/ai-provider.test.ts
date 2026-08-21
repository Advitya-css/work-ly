import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openAICompatibleProvider } from "@/lib/ai/providers/openai-compatible";

/**
 * The AI provider used to have no timeout and no retry: a hung upstream
 * request blocked a parse indefinitely, and a single rate-limit response or
 * dropped connection failed the whole extraction even though a normal client
 * would just retry and move on. These tests pin down the fix: retryable
 * failures (429, 5xx, network errors, timeouts) get a bounded number of
 * attempts with backoff, non-retryable failures (401, 400) fail immediately,
 * and a healthy response is never delayed or retried.
 */

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function textErrorResponse(status: number, text = "upstream error") {
  return {
    ok: false,
    status,
    json: async () => JSON.parse(text),
    text: async () => text,
  } as Response;
}

describe("openAICompatibleProvider reliability", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.AI_API_KEY = "test-key";
    process.env.AI_BASE_URL = "https://example.test/v1";
    process.env.AI_MODEL = "test-model";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("succeeds on the first attempt with no retry", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ choices: [{ message: { content: "hello" } }] }),
    );

    const result = await openAICompatibleProvider.complete({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("hello");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 and succeeds once the rate limit clears", async () => {
    fetchMock
      .mockResolvedValueOnce(textErrorResponse(429, "rate limited"))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "ok" } }] }));

    const result = await openAICompatibleProvider.complete({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a 500 and gives up after the maximum number of attempts", async () => {
    fetchMock.mockResolvedValue(textErrorResponse(500, "server error"));

    await expect(
      openAICompatibleProvider.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/500/);

    // Bounded retries, not indefinite - three attempts total.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 401 - a bad key will not fix itself", async () => {
    fetchMock.mockResolvedValueOnce(textErrorResponse(401, "invalid api key"));

    await expect(
      openAICompatibleProvider.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/401/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 400 - a malformed request will not fix itself", async () => {
    fetchMock.mockResolvedValueOnce(textErrorResponse(400, "bad request"));

    await expect(
      openAICompatibleProvider.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/400/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a dropped connection and succeeds on the next attempt", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "recovered" } }] }));

    const result = await openAICompatibleProvider.complete({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a timeout the same way it retries a dropped connection", async () => {
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "TimeoutError";

    fetchMock
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "recovered" } }] }));

    const result = await openAICompatibleProvider.complete({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe("recovered");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passes an AbortSignal with a bounded timeout on every request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "hi" } }] }));

    await openAICompatibleProvider.complete({ messages: [{ role: "user", content: "hi" }] });

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("still falls back to no parsed value when the model ignores the response schema", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ choices: [{ message: { content: "not json" } }] }),
    );

    const result = await openAICompatibleProvider.complete({
      messages: [{ role: "user", content: "hi" }],
      responseSchema: { name: "x", schema: { type: "object", properties: {} } },
    });

    expect(result.content).toBe("not json");
    expect(result.parsed).toBeUndefined();
  });
});
