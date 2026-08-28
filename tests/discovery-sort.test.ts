import { describe, it, expect } from "vitest";

import { comparePriority, recommendationRank } from "@/lib/discovery/sort";
import type { DiscoveredJob } from "@/lib/db/types";

/**
 * Regression coverage for a real bug found from live production
 * screenshots: the default "Top Matches (For You)" sort ordered purely by
 * the blended relevance score, which defaults to ~neutral (0.5) on every
 * component for a sparse/unscored job rather than penalizing it - so a job
 * Workly had explicitly bucketed Low Priority (for having too little data
 * to assess, see scoring/providers/stub.ts) could still rank #1 under "Top
 * Matches," directly above the page's own bucket counts saying otherwise.
 */

function scored(recommendation: DiscoveredJob["recommendation"] | null, score: number) {
  return { job: { recommendation } as DiscoveredJob, score };
}

describe("recommendationRank", () => {
  it("orders Apply Now > Strong > Stretch > Low Priority > Skip", () => {
    expect(recommendationRank("APPLY_NOW")).toBeGreaterThan(recommendationRank("APPLY"));
    expect(recommendationRank("APPLY")).toBeGreaterThan(recommendationRank("STRETCH"));
    expect(recommendationRank("STRETCH")).toBeGreaterThan(recommendationRank("LOW_PRIORITY"));
    expect(recommendationRank("LOW_PRIORITY")).toBeGreaterThan(recommendationRank("SKIP"));
  });

  it("ranks a job with no recommendation at all below an explicit Low Priority", () => {
    // Not yet scored is not the same claim as "we assessed it and it's low
    // priority" - it should never look better than an explicit tier.
    expect(recommendationRank(null)).toBeLessThan(recommendationRank("LOW_PRIORITY"));
  });
});

describe("comparePriority - the 'Top Matches (For You)' sort", () => {
  it("never lets a Low Priority job outrank a Strong (APPLY) job, even with a higher blended relevance score", () => {
    // This is the exact scenario from the live bug report: a sparse,
    // low-data job (missing signals defaulting to ~neutral on every
    // blended-score component) scored HIGHER on raw relevance than a real,
    // well-assessed Strong match, and appeared first under "Top Matches."
    const lowPriorityButHighRelevance = scored("LOW_PRIORITY", 0.9);
    const strongButLowerRelevance = scored("APPLY", 0.5);

    const sorted = [lowPriorityButHighRelevance, strongButLowerRelevance].sort(comparePriority);
    expect(sorted[0]).toBe(strongButLowerRelevance);
  });

  it("uses blended relevance score only as a tiebreaker within the same recommendation tier", () => {
    const higherRelevance = scored("APPLY", 0.8);
    const lowerRelevance = scored("APPLY", 0.4);
    const sorted = [lowerRelevance, higherRelevance].sort(comparePriority);
    expect(sorted[0]).toBe(higherRelevance);
  });

  it("ranks Apply Now above Strong above Stretch above Low Priority regardless of score", () => {
    const applyNow = scored("APPLY_NOW", 0.1);
    const strong = scored("APPLY", 0.9);
    const stretch = scored("STRETCH", 0.9);
    const lowPriority = scored("LOW_PRIORITY", 0.9);

    const sorted = [lowPriority, stretch, strong, applyNow].sort(comparePriority);
    expect(sorted.map((s) => s.job.recommendation)).toEqual(["APPLY_NOW", "APPLY", "STRETCH", "LOW_PRIORITY"]);
  });
});
