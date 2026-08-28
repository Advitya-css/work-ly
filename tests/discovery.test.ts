import { describe, it, expect } from "vitest";

import { deduplicateBatch, descriptionSimilarity, canonicalUrl, isDuplicate } from "@/lib/discovery/dedupe";
import { normalizeListing, buildDedupeKey, stripHtml, listingMatchesQueryLiterally } from "@/lib/discovery/normalize";
import { validateListing } from "@/lib/discovery/sources/base";
import { SOURCE_ADAPTERS } from "@/lib/discovery/registry";
import { expandQuery } from "@/lib/search/role-graph";
import { localEmbed, cosineSimilarity } from "@/lib/search/embeddings";
import type { NormalizedListing, RawListing } from "@/lib/discovery/types";

function raw(overrides: Partial<RawListing> = {}): RawListing {
  return {
    externalId: "x1",
    title: "Product Analyst",
    company: "Northwind Retail",
    location: "London",
    description: "Requirements (must have):\n- 2+ years of experience\n- Strong SQL skills",
    url: "https://example.invalid/jobs/1",
    postedAt: new Date("2026-08-01"),
    ...overrides,
  };
}

describe("normalization", () => {
  it("collapses cosmetic company and location differences into one dedupe key", () => {
    // The whole cross-source dedup story rests on this: the same job seen
    // via two feeds must produce identical keys despite formatting drift.
    const a = buildDedupeKey("Northwind Retail Ltd", "Product Analyst", "London, UK");
    const b = buildDedupeKey("Northwind Retail", "Product Analyst", "London");
    expect(a).toBe(b);
  });

  it("keeps genuinely different roles apart", () => {
    expect(buildDedupeKey("Acme", "Data Analyst", "London")).not.toBe(
      buildDedupeKey("Acme", "Product Manager", "London"),
    );
  });

  it("strips HTML that feed sources embed", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toContain("Hello world");
    expect(stripHtml("<p>a</p>")).not.toContain("<p>");
  });

  it("never invents fields the source didn't state", () => {
    const listing = normalizeListing(raw({ description: null, location: null }));
    expect(listing.location).toBeNull();
    expect(listing.salaryMin).toBeNull();
    expect(listing.salaryMax).toBeNull();
    expect(listing.industry).toBeNull();
  });

  it("reads seniority from the title in preference to the body", () => {
    const listing = normalizeListing(
      raw({ title: "Senior Product Analyst", description: "Work with junior stakeholders daily." }),
    );
    expect(listing.seniority).toBe("SENIOR");
  });
});

describe("deduplication", () => {
  it("treats the same URL as the same posting regardless of tracking parameters", () => {
    expect(canonicalUrl("https://example.com/a/1?utm_source=feed")).toBe(
      canonicalUrl("https://www.example.com/a/1?ref=board"),
    );
  });

  it("folds a cross-source duplicate that differs only cosmetically", () => {
    const listings = [
      normalizeListing(raw({ externalId: "a", company: "Northwind Retail" })),
      normalizeListing(
        raw({
          externalId: "b",
          company: "Northwind Retail Ltd",
          location: "London, UK",
          url: "https://other.invalid/board/1",
        }),
      ),
    ];
    const { unique, folded } = deduplicateBatch(listings);
    expect(folded).toBe(1);
    expect(unique).toHaveLength(1);
  });

  it("does NOT merge two genuinely different roles at the same company", () => {
    // Wrongly merging hides a job the user never learns exists, which is
    // worse than showing one duplicate — so this must stay conservative.
    const listings = [
      normalizeListing(raw({ externalId: "a", title: "Product Analyst" })),
      normalizeListing(raw({ externalId: "b", title: "Product Manager", url: "https://x.invalid/2" })),
    ];
    const { unique, folded } = deduplicateBatch(listings);
    expect(folded).toBe(0);
    expect(unique).toHaveLength(2);
  });

  it("keeps the richer version when folding", () => {
    // Sharing a URL forces them to fold, testing the merge logic
    const short = normalizeListing(raw({ externalId: "a", url: "https://same.invalid/1", description: "Short." }));
    const long = normalizeListing(
      raw({
        externalId: "b",
        url: "https://same.invalid/1",
        description: "A far longer description ".repeat(20),
      }),
    );
    const { unique } = deduplicateBatch([short, long]);
    expect(unique[0].description!.length).toBeGreaterThan(100);
  });

  it("scores description similarity between 0 and 1", () => {
    expect(descriptionSimilarity("alpha beta gamma", "alpha beta gamma")).toBeCloseTo(1, 5);
    expect(descriptionSimilarity("alpha beta", "zulu yankee")).toBe(0);
    expect(descriptionSimilarity(null, "anything")).toBe(0);
  });

  it("reports why two listings were judged the same", () => {
    const a = normalizeListing(raw({ externalId: "a" }));
    const verdict = isDuplicate(a, {
      id: "b",
      dedupeKey: a.dedupeKey,
      sourceUrl: a.sourceUrl,
      company: a.company,
      title: a.title,
      location: a.location,
      description: a.description,
    });
    expect(verdict.duplicate).toBe(true);
    expect(verdict.reason).toBeTruthy();
  });
});

describe("listing validation", () => {
  it("rejects a listing with no title", () => {
    const listing = normalizeListing(raw({ title: "" }));
    expect(validateListing(listing).ok).toBe(false);
  });

  it("rejects a future-dated posting, since the feed's dates can't be trusted", () => {
    const listing = normalizeListing(raw({ postedAt: new Date(Date.now() + 90 * 86400_000) }));
    expect(validateListing(listing).ok).toBe(false);
  });

  it("accepts a well-formed listing", () => {
    expect(validateListing(normalizeListing(raw())).ok).toBe(true);
  });
});

describe("source registry — legal compliance", () => {
  it("every adapter declares a written legal basis", () => {
    for (const adapter of SOURCE_ADAPTERS) {
      expect(adapter.legalBasis, `${adapter.id} has no legal basis`).toBeTruthy();
      expect(adapter.legalBasis.length).toBeGreaterThan(30);
    }
  });

  it("contains no adapter targeting a service that prohibits automated access", () => {
    // A guard against someone adding one later: these names should never
    // appear as a source id or name in this codebase.
    const forbidden = /linkedin|indeed|glassdoor|monster|ziprecruiter/i;
    for (const adapter of SOURCE_ADAPTERS) {
      expect(forbidden.test(adapter.id), `${adapter.id} looks like a restricted service`).toBe(false);
      expect(forbidden.test(adapter.name), `${adapter.name} looks like a restricted service`).toBe(false);
    }
  });

  it("covers all seven source kinds required by the spec", () => {
    const kinds = new Set(SOURCE_ADAPTERS.map((a) => a.kind));
    for (const required of [
      "COMPANY_CAREER",
      "PUBLIC_JOB_BOARD",
      "GOVERNMENT",
      "UNIVERSITY",
      "EMPLOYER_FEED",
      "API_PROVIDER",
      "MANUAL_IMPORT",
    ]) {
      expect(kinds.has(required as never), `missing ${required}`).toBe(true);
    }
  });
});

describe("hidden role discovery", () => {
  const mediaProfile =
    "Assistant Producer at a documentary company. Research, storytelling, video editing, interview scheduling, archive sourcing for broadcast media.";
  const accountingProfile = "Accountant. Bookkeeping, tax compliance, payroll, audit, ledgers.";

  it("expands a field into the roles actually advertised, for a relevant profile", () => {
    const expansion = expandQuery("documentary filmmaking", mediaProfile);
    const roles = expansion.expandedRoles.map((r) => r.role);
    expect(roles).toContain("Story Producer");
    expect(roles).toContain("Documentary Researcher");
  });

  it("suppresses expansion when the profile has no connection to the field", () => {
    // The most important assertion in this file: without the gate, an
    // accountant searching "documentary filmmaking" gets buried in
    // television jobs, which is worse than returning nothing.
    const expansion = expandQuery("documentary filmmaking", accountingProfile);
    expect(expansion.expandedRoles).toHaveLength(0);
    expect(expansion.suppressed.length).toBeGreaterThan(0);
    expect(expansion.suppressed[0].reason).toBeTruthy();
  });

  it("always preserves the literal search terms", () => {
    const expansion = expandQuery("documentary filmmaking", accountingProfile);
    expect(expansion.literalTerms).toContain("documentary");
  });

  // Regression test: alias matching used to be a raw substring check, so
  // "product" (the Product Management cluster's alias) matched inside
  // "production coordinator" even though the words are unrelated - a
  // search for "production coordinator" (itself a real title in the
  // Documentary cluster's own role list) could silently pull in Product
  // Manager/Product Owner as "related roles" for anyone whose profile
  // happened to clear the Product affinity gate.
  it("does not expand a query into a cluster whose alias is only a substring, not a whole-word match", () => {
    const productLeaningProfile =
      "Product manager. Roadmap ownership, stakeholder alignment, backlog prioritization, user research.";
    const expansion = expandQuery("production coordinator", productLeaningProfile);
    const roles = expansion.expandedRoles.map((r) => r.role);
    expect(roles).not.toContain("Product Manager");
    expect(roles).not.toContain("Product Owner");
  });

  it("still expands a genuine whole-word alias match", () => {
    const productProfile =
      "Product manager. Roadmap ownership, stakeholder alignment, backlog prioritization, user research.";
    const expansion = expandQuery("product manager", productProfile);
    const roles = expansion.expandedRoles.map((r) => r.role);
    expect(roles).toContain("Product Owner");
  });

  // Regression guard for a real user complaint: "urban planning and
  // climate" (a vague-interest, Explore-mode-style query) returned nothing
  // useful because no cluster covered that space at all - the local
  // embedding provider is lexical (see embeddings.ts) and cannot bridge
  // "climate" to "Sustainability Analyst" on its own.
  it("expands a climate/sustainability interest into the roles actually advertised", () => {
    const sustainabilityProfile =
      "Sustainability coordinator. ESG reporting, carbon accounting, renewable energy policy, stakeholder engagement.";
    const expansion = expandQuery("urban planning and climate", sustainabilityProfile);
    const roles = expansion.expandedRoles.map((r) => r.role);
    expect(roles).toContain("Sustainability Analyst");
    expect(roles.some((r) => r.includes("Climate") || r.includes("Environmental"))).toBe(true);
  });
});

describe("listingMatchesQueryLiterally", () => {
  const listing = normalizeListing(
    raw({ title: "Senior Product Analyst", company: "Northwind Retail", description: "Own the roadmap." }),
  );

  it("is true when the query appears in the listing's own text", () => {
    expect(listingMatchesQueryLiterally(listing, "product analyst")).toBe(true);
    expect(listingMatchesQueryLiterally(listing, "northwind")).toBe(true);
    expect(listingMatchesQueryLiterally(listing, "roadmap")).toBe(true);
  });

  it("is false when the query shares nothing with the listing", () => {
    // Regression guard: this is exactly the case that used to get labeled
    // "Matched your search" by default for sources (feeds, company-career
    // boards) that don't filter by query at all - a fabricated relevance
    // claim on a listing that has nothing to do with what was searched.
    expect(listingMatchesQueryLiterally(listing, "warehouse forklift operator")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(listingMatchesQueryLiterally(listing, "PRODUCT ANALYST")).toBe(true);
  });
});

describe("embeddings", () => {
  it("is deterministic, so stored vectors stay valid", () => {
    expect(localEmbed("product analyst sql")).toEqual(localEmbed("product analyst sql"));
  });

  it("is normalized, so cosine similarity is a plain dot product", () => {
    const v = localEmbed("data analyst with sql and python experience");
    const magnitude = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("scores related text above unrelated text", () => {
    const reference = localEmbed("senior data analyst sql dashboards reporting");
    const related = localEmbed("data analyst sql reporting dashboards");
    const unrelated = localEmbed("pastry chef bakery bread ovens");
    expect(cosineSimilarity(reference, related)).toBeGreaterThan(
      cosineSimilarity(reference, unrelated),
    );
  });

  it("handles empty input without throwing", () => {
    expect(() => localEmbed("")).not.toThrow();
    expect(cosineSimilarity([], [])).toBe(0);
  });
});
