import { describe, expect, it } from "vitest";

import { DEFAULT_QUALITY_MODEL, DEFAULT_STANDARD_MODEL, modelChain } from "@/lib/ai/providers/google-genai";
import { fitQualityFor } from "@/lib/ai/quality-core";

describe("modelChain", () => {
  it("keeps standard calls on the current model, with no stronger model in the chain", () => {
    const chain = modelChain("standard", { AI_MODEL: "gemini-3.5-flash-lite" });
    expect(chain[0]).toBe("gemini-3.5-flash-lite");
    expect(chain).not.toContain(DEFAULT_QUALITY_MODEL);
    expect(modelChain(undefined, {})[0]).toBe(DEFAULT_STANDARD_MODEL);
  });

  it("leads high-quality calls with the stronger model, then falls back to the current one", () => {
    const chain = modelChain("high", { AI_MODEL: "gemini-3.5-flash-lite" });
    expect(chain.slice(0, 2)).toEqual([DEFAULT_QUALITY_MODEL, "gemini-3.5-flash-lite"]);
    expect(modelChain("high", { AI_MODEL: "x", AI_QUALITY_MODEL: "gemini-3.1-pro" })[0]).toBe("gemini-3.1-pro");
  });

  it("no longer falls back to the restricted 2.5 models", () => {
    expect(modelChain("high", {}).some((m) => m.includes("2.5"))).toBe(false);
  });
});

describe("fitQualityFor", () => {
  const now = new Date("2026-09-26T12:00:00Z");
  it("gives active Pro the stronger model and everyone else the standard one", () => {
    expect(fitQualityFor({ isPro: true, proUntil: null }, now)).toBe("high");
    expect(fitQualityFor({ isPro: true, proUntil: new Date("2027-01-01") }, now)).toBe("high");
    expect(fitQualityFor({ isPro: true, proUntil: new Date("2026-09-01") }, now)).toBe("standard");
    expect(fitQualityFor({ isPro: false, proUntil: null }, now)).toBe("standard");
    expect(fitQualityFor(null, now)).toBe("standard");
  });
});
