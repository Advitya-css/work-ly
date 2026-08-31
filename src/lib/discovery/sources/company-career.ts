import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * COMPANY CAREER SOURCES
 *
 * Reads a company's own careers board through the public JSON API its
 * applicant tracking system publishes.
 *
 * LEGAL BASIS: Greenhouse, Lever and Ashby all expose documented, keyless,
 * read-only board endpoints whose stated purpose is letting third parties
 * display a company's open roles. Using them is the intended behaviour,
 * not a workaround - this is the opposite of scraping a site that forbids
 * it. Work-ly hits one board per configured company, on demand, and caches
 * the result.
 *
 * The user supplies the board token (the company's handle on that ATS),
 * which is visible in the careers page URL.
 */

interface GreenhouseJob {
  id?: number | string;
  title?: string;
  absolute_url?: string;
  updated_at?: string;
  content?: string;
  location?: { name?: string };
  departments?: { name?: string }[];
}

export const greenhouseSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "COMPANY_CAREER",
  id: "greenhouse",
  name: "Greenhouse board",
  legalBasis:
    "Greenhouse publishes a keyless, read-only board API (boards-api.greenhouse.io) specifically so third parties can display a company's open roles. Read-only, one request per configured board.",
  requires: "The company's Greenhouse board token, e.g. the 'acme' in boards.greenhouse.io/acme",

  isConfigured(config) {
    return typeof config.boardToken === "string" && config.boardToken.trim().length > 0;
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const boardToken = String(context.config.boardToken ?? "").trim();
    if (!boardToken) return [];

    const body = await fetchWithGuards(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
    );
    const parsed = JSON.parse(body) as { jobs?: GreenhouseJob[] };
    const jobs = parsed.jobs ?? [];

    return jobs.slice(0, context.limit).map((job) => ({
      externalId: `greenhouse:${boardToken}:${job.id ?? job.absolute_url ?? job.title}`,
      title: asString(job.title) ?? "Untitled role",
      company: boardToken,
      location: asString(job.location?.name),
      // Greenhouse returns HTML-escaped content; stripHtml in the shared
      // normalizer handles the tags, and this undoes the escaping first.
      description: job.content
        ? job.content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
        : null,
      url: asString(job.absolute_url),
      postedAt: asDate(job.updated_at),
      industry: asString(job.departments?.[0]?.name),
    }));
  },
};

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  createdAt?: number;
  descriptionPlain?: string;
  categories?: { location?: string; team?: string; commitment?: string };
}

export const leverSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "COMPANY_CAREER",
  id: "lever",
  name: "Lever board",
  legalBasis:
    "Lever publishes a keyless, read-only postings API (api.lever.co/v0/postings) intended for third-party display of a company's open roles. Read-only, one request per configured board.",
  requires: "The company's Lever handle, e.g. the 'acme' in jobs.lever.co/acme",

  isConfigured(config) {
    return typeof config.boardToken === "string" && config.boardToken.trim().length > 0;
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const boardToken = String(context.config.boardToken ?? "").trim();
    if (!boardToken) return [];

    const body = await fetchWithGuards(
      `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`,
    );
    const postings = JSON.parse(body) as LeverPosting[];

    return (Array.isArray(postings) ? postings : []).slice(0, context.limit).map((posting) => ({
      externalId: `lever:${boardToken}:${posting.id ?? posting.hostedUrl ?? posting.text}`,
      title: asString(posting.text) ?? "Untitled role",
      company: boardToken,
      location: asString(posting.categories?.location),
      description: asString(posting.descriptionPlain),
      url: asString(posting.hostedUrl),
      postedAt: posting.createdAt ? new Date(posting.createdAt) : null,
      employmentTypeRaw: asString(posting.categories?.commitment),
      industry: asString(posting.categories?.team),
    }));
  },
};

/**
 * SCHEMA.ORG JOBPOSTING SOURCE.
 *
 * Greenhouse and Lever only cover companies using those two ATSes. Most
 * companies with a careers page - regardless of what runs behind it - embed
 * schema.org JobPosting structured data in the page itself, because that is
 * what makes a role show up in Google for Jobs. A company writes that markup
 * specifically so software can read it without a human in the loop.
 *
 * LEGAL BASIS: reading structured data a company published on its own
 * public page, for the express purpose of indexing by exactly this kind of
 * reader, is the intended use of the markup - not a workaround. One page
 * fetch per configured URL, no login, no anti-bot bypass.
 */

interface JsonLdPlace {
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string | { name?: string };
  };
}

interface JsonLdJobPosting {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  employmentType?: string | string[];
  identifier?: { value?: string } | string;
  hiringOrganization?: { name?: string };
  jobLocation?: JsonLdPlace | JsonLdPlace[];
  baseSalary?: {
    currency?: string;
    value?: { minValue?: number; maxValue?: number; value?: number };
  };
}

function isJobPostingType(type: unknown): boolean {
  if (typeof type === "string") return type === "JobPosting";
  if (Array.isArray(type)) return type.includes("JobPosting");
  return false;
}

function collectJobPostings(node: unknown, out: JsonLdJobPosting[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectJobPostings(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (isJobPostingType(obj["@type"])) out.push(obj as JsonLdJobPosting);
  if (Array.isArray(obj["@graph"])) collectJobPostings(obj["@graph"], out);
}

/** A page can embed several JSON-LD blocks, and a malformed one should not sink the rest. */
function extractJobPostings(html: string): JsonLdJobPosting[] {
  const out: JsonLdJobPosting[] = [];
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, raw] of scripts) {
    try {
      collectJobPostings(JSON.parse(raw.trim()), out);
    } catch {
      // Malformed JSON-LD on the page - skip it rather than guess at it.
    }
  }
  return out;
}

function placeToLocation(place?: JsonLdPlace | JsonLdPlace[]): { location: string | null; country: string | null } {
  const first = Array.isArray(place) ? place[0] : place;
  const address = first?.address;
  if (!address) return { location: null, country: null };
  const countryRaw = address.addressCountry;
  const country = typeof countryRaw === "string" ? countryRaw : asString(countryRaw?.name);
  const location = [address.addressLocality, address.addressRegion].filter(Boolean).join(", ") || null;
  return { location, country };
}

function stripTagsForJsonLd(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const jobPostingSchemaSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "COMPANY_CAREER",
  id: "jobposting-schema",
  name: "Careers page (schema.org)",
  legalBasis:
    "schema.org JobPosting structured data that a company embeds in its own careers page specifically so search engines and other software can index its roles - the same markup that powers Google for Jobs. Reading a first-party page's own published data is the intended use; one fetch per configured URL, no login, no anti-bot bypass.",
  requires: "The URL of the company's careers or job listing page",

  isConfigured(config) {
    const url = config.careersUrl;
    return typeof url === "string" && /^https?:\/\//i.test(url.trim());
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const careersUrl = String(context.config.careersUrl ?? "").trim();
    if (!careersUrl) return [];

    const html = await fetchWithGuards(careersUrl);
    const postings = extractJobPostings(html);
    const defaultCompany = asString(context.config.company);

    return postings.slice(0, context.limit).map((posting, index) => {
      const { location, country } = placeToLocation(posting.jobLocation);
      const identifier =
        typeof posting.identifier === "string" ? posting.identifier : asString(posting.identifier?.value);
      const salary = posting.baseSalary?.value;
      const minValue = typeof salary?.minValue === "number" ? salary.minValue : salary?.value;
      const maxValue = typeof salary?.maxValue === "number" ? salary.maxValue : null;

      return {
        externalId: `jobposting-schema:${careersUrl}:${identifier ?? posting.title ?? index}`,
        title: asString(posting.title) ?? "Untitled role",
        company: asString(posting.hiringOrganization?.name) ?? defaultCompany,
        location,
        country,
        description: posting.description ? stripTagsForJsonLd(posting.description) : null,
        url: careersUrl,
        postedAt: asDate(posting.datePosted),
        salaryMin: typeof minValue === "number" ? Math.round(minValue) : null,
        salaryMax: typeof maxValue === "number" ? Math.round(maxValue) : null,
        salaryCurrency: asString(posting.baseSalary?.currency),
        employmentTypeRaw: Array.isArray(posting.employmentType)
          ? asString(posting.employmentType[0])
          : asString(posting.employmentType),
      };
    });
  },
};
