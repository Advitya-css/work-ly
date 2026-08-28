import { describe, it, expect } from "vitest";

import { buildSearchTerms, MAX_SEARCH_TERMS } from "@/lib/discovery/run";

/**
 * Interest-Based Explore mode's search-term fan-out: the literal query plus
 * up to MAX_SEARCH_TERMS-1 more titles (role-graph, then AI-suggested),
 * deduped case-insensitively and capped so one Explore search can't turn
 * into an unbounded number of live API calls. See run.ts's doc comments on
 * RunDiscoveryOptions.expandSearch and buildSearchTerms for the feature.
 */
describe("buildSearchTerms (Interest-Based Explore mode)", () => {
  it("returns just the literal query when there is nothing to expand with", () => {
    expect(buildSearchTerms("urban planning", [], [])).toEqual(["urban planning"]);
  });

  it("returns [undefined] for an empty/undefined query - a plain browse run", () => {
    expect(buildSearchTerms(undefined, ["Sustainability Analyst"], ["Smart City Planner"])).toEqual([undefined]);
    expect(buildSearchTerms("", ["Sustainability Analyst"], [])).toEqual([""]);
  });

  it("always keeps the literal query first, then adds role-graph titles, then AI titles", () => {
    const terms = buildSearchTerms(
      "climate and urban planning",
      ["Sustainability Analyst", "Urban Planner"],
      ["Smart City Planner"],
    );
    expect(terms).toEqual([
      "climate and urban planning",
      "Sustainability Analyst",
      "Urban Planner",
      "Smart City Planner",
    ]);
  });

  it("caps the total number of terms at the max, dropping whatever would exceed it", () => {
    const terms = buildSearchTerms(
      "climate",
      ["Role A", "Role B", "Role C"],
      ["AI Role D", "AI Role E"],
      3,
    );
    expect(terms).toHaveLength(3);
    expect(terms).toEqual(["climate", "Role A", "Role B"]);
  });

  it("defaults the cap to MAX_SEARCH_TERMS when none is given", () => {
    const terms = buildSearchTerms("climate", ["A", "B", "C", "D", "E"], []);
    expect(terms).toHaveLength(MAX_SEARCH_TERMS);
  });

  it("dedupes case-insensitively against the literal query and across both title sources", () => {
    const terms = buildSearchTerms(
      "Sustainability Analyst",
      ["sustainability analyst", "Urban Planner"],
      ["URBAN PLANNER", "Smart City Planner"],
    );
    // "sustainability analyst" collapses into the literal query; "URBAN
    // PLANNER" collapses into the role-graph "Urban Planner" already added.
    expect(terms).toEqual(["Sustainability Analyst", "Urban Planner", "Smart City Planner"]);
  });

  it("never invents a term - every non-literal term traces to a role-graph or AI title actually passed in", () => {
    const roleGraphTitles = ["Sustainability Analyst"];
    const aiTitles = ["Smart City Planner"];
    const terms = buildSearchTerms("climate and cities", roleGraphTitles, aiTitles);
    for (const term of terms.slice(1)) {
      expect([...roleGraphTitles, ...aiTitles]).toContain(term);
    }
  });
});
