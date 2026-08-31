import { sourceDefaults } from "@/lib/discovery/sources/base";
import { DEMO_LISTINGS } from "@/lib/discovery/fixtures/demo-listings";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * DEMO SOURCE - bundled fictional listings.
 *
 * Exists so the whole discovery pipeline (ingest → normalize → dedupe →
 * embed → score → bucket → search) can be exercised and demonstrated with
 * no API keys and no network access. Every other source needs a credential
 * or a URL the user has to supply; this one needs nothing.
 *
 * These are FICTIONAL. Every listing carries a demo source name and the
 * UI labels the source on every card, so a demo listing can never be
 * mistaken for a real vacancy. Two of them are deliberate near-duplicates
 * of others under different companies and phrasings, so deduplication has
 * something real to catch.
 */
export const demoFeedSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "DEMO",
  id: "demo-feed",
  name: "Work-ly demo listings (fictional)",
  legalBasis:
    "Fictional listings written for this project. No third party is involved and nothing is fetched.",

  isConfigured() {
    return true;
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const query = (context.query ?? "").trim().toLowerCase();

    // Filtering here mirrors what a real source's server-side query would
    // do, so a query-driven run behaves the same shape as a live one.
    const matching = query
      ? DEMO_LISTINGS.filter((listing) =>
          `${listing.title} ${listing.company} ${listing.description}`.toLowerCase().includes(query),
        )
      : DEMO_LISTINGS;

    // Fall back to everything when a query matches nothing - the role-graph
    // expansion in the search engine is what turns an unmatched literal
    // term into relevant roles, and it can only do that if it has listings
    // to work with.
    const pool = matching.length > 0 ? matching : DEMO_LISTINGS;

    return pool.slice(0, context.limit).map((listing) => ({
      externalId: `demo:${listing.id}`,
      title: listing.title,
      company: listing.company,
      location: listing.location,
      country: listing.country,
      description: listing.description,
      url: listing.url,
      postedAt: new Date(Date.now() - listing.postedDaysAgo * 24 * 60 * 60 * 1000),
      industry: listing.industry,
    }));
  },
};
