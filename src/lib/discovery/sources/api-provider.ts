import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * LICENSED API PROVIDER.
 *
 * LEGAL BASIS: a commercial job-data provider used under its own API terms
 * with an issued key. The user brings their own credentials, which means
 * the licence relationship is between them and the provider, and Workly
 * simply consumes what that licence permits.
 *
 * Implemented against Adzuna's documented search API as the reference
 * shape, because it's widely available and its response format is typical.
 * Swapping in another licensed provider means writing one more `ingest` -
 * everything downstream is provider-agnostic.
 *
 * Credentials live in the environment (ADZUNA_APP_ID / ADZUNA_APP_KEY),
 * never in the database.
 */

interface AdzunaResult {
  id?: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  category?: { label?: string };
}

export const apiProviderSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "API_PROVIDER",
  id: "adzuna",
  name: "Adzuna",
  legalBasis:
    "A commercial job-data API consumed under the user's own issued credentials and the provider's API terms. No scraping; the provider licenses this data for exactly this purpose.",
  requires: "ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables from your own Adzuna account",

  isConfigured() {
    return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    const country = String(context.config.country ?? "gb").toLowerCase();
    let what = String(context.config.keyword ?? context.query ?? "").trim();
    if (context.isFreelanceMode) {
      what = what ? `${what} (freelance OR gig OR contract)` : "freelance OR gig OR contract";
    }

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(Math.min(context.limit, 50)),
      "content-type": "application/json",
    });
    if (what) params.set("what", what);
    const where = asString(context.config.locationName) || context.homeLocation;
    if (where) params.set("where", where);
    if (context.isPartTimeMode) {
      params.set("part_time", "1");
    }
    if (context.isFreelanceMode) {
      params.set("contract", "1");
    }

    const body = await fetchWithGuards(
      `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/1?${params.toString()}`,
    );
    const parsed = JSON.parse(body) as { results?: AdzunaResult[] };

    return (parsed.results ?? []).slice(0, context.limit).map((result) => ({
      externalId: `adzuna:${result.id ?? result.redirect_url ?? result.title}`,
      title: asString(result.title) ?? "Untitled role",
      company: asString(result.company?.display_name),
      location: asString(result.location?.display_name),
      country: asString(result.location?.area?.[0]),
      description: asString(result.description),
      url: asString(result.redirect_url),
      postedAt: asDate(result.created),
      salaryMin: typeof result.salary_min === "number" ? Math.round(result.salary_min) : null,
      salaryMax: typeof result.salary_max === "number" ? Math.round(result.salary_max) : null,
      // Only claim a currency when the country makes it unambiguous;
      // guessing would put a wrong symbol in front of a real number.
      salaryCurrency: country === "gb" ? "GBP" : country === "us" ? "USD" : null,
      employmentTypeRaw: [result.contract_time, result.contract_type].filter(Boolean).join(" ") || null,
      industry: asString(result.category?.label),
    }));
  },
};
