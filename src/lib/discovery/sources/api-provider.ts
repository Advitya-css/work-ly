import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * LICENSED API PROVIDER.
 *
 * LEGAL BASIS: a commercial job-data provider used under its own API terms
 * with an issued key. The user brings their own credentials, which means
 * the licence relationship is between them and the provider, and Work-ly
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

        
    const loc = (context.homeLocation || "").toLowerCase().trim();
    let defaultCountry = "us"; // US is a better global default than GB for tech jobs if unrecognized

    // Extensive mapping of global cities, regions, and countries to Adzuna's 20 supported country codes
    const geoMap: Record<string, string[]> = {
      us: ["us", "usa", "united states", "new york", "san francisco", "los angeles", "chicago", "boston", "seattle", "austin", "california", "texas", "ny", "sf", "bay area", "atlanta", "denver", "miami", "washington", "dallas", "houston"],
      ca: ["ca", "canada", "toronto", "vancouver", "montreal", "calgary", "ottawa", "ontario", "bc", "quebec", "alberta", "waterloo"],
      gb: ["gb", "uk", "united kingdom", "london", "manchester", "edinburgh", "birmingham", "scotland", "wales", "england", "glasgow"],
      au: ["au", "australia", "sydney", "melbourne", "brisbane", "perth", "adelaide", "nsw", "victoria", "queensland"],
      in: ["in", "india", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "pune", "chennai", "gurgaon", "noida", "kerala"],
      sg: ["sg", "singapore"],
      de: ["de", "germany", "berlin", "munich", "hamburg", "frankfurt", "cologne", "stuttgart"],
      fr: ["fr", "france", "paris", "lyon", "marseille", "toulouse"],
      nl: ["nl", "netherlands", "amsterdam", "rotterdam", "the hague", "utrecht", "holland"],
      za: ["za", "south africa", "cape town", "johannesburg", "pretoria", "durban"],
      nz: ["nz", "new zealand", "auckland", "wellington", "christchurch"],
      it: ["it", "italy", "rome", "milan", "naples", "turin"],
      es: ["es", "spain", "madrid", "barcelona", "valencia", "seville"],
      pl: ["pl", "poland", "warsaw", "krakow", "wroclaw"],
      br: ["br", "brazil", "sao paulo", "rio de janeiro", "brasilia"],
      mx: ["mx", "mexico", "mexico city", "guadalajara", "monterrey"],
      at: ["at", "austria", "vienna", "salzburg"],
      ch: ["ch", "switzerland", "zurich", "geneva", "basel"],
      be: ["be", "belgium", "brussels", "antwerp"],
      ru: ["ru", "russia", "moscow", "st petersburg"]
    };

    // Detect country by checking exact matches and includes
    for (const [code, terms] of Object.entries(geoMap)) {
      if (terms.some(term => 
        loc === term || 
        loc.endsWith(`, ${term}`) || 
        loc.endsWith(` ${term}`) ||
        loc.includes(`${term},`)
      )) {
        defaultCountry = code;
        break;
      }
    }

    const country = String(context.config.country ?? defaultCountry).toLowerCase();
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
    let where = asString(context.config.locationName) || context.homeLocation;
    if (where) {
      // Adzuna API is already scoped by country in the URL. Passing the country in the 'where' 
      // parameter frequently breaks its geocoding. Strip known countries.
      where = where.replace(/,\s*(canada|ca|united states|usa|us|australia|au|india|in|germany|de|france|fr|new zealand|nz|south africa|za|singapore|sg|netherlands|nl|italy|it|spain|es|poland|pl|brazil|br|mexico|mx|austria|at|switzerland|ch|belgium|be|uk|united kingdom|gb|england|russia|ru)$/i, '').trim();
      params.set("where", where);
    }
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
