import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

import { titleIsRelevant } from "@/lib/discovery/relevance";
import { placeMatches } from "@/lib/places";

/**
 * One fetch per board per run. Discovery calls ingest() once per search term
 * (often 4), and a board's full listing is the same for every term - so the
 * body is shared for a few minutes instead of downloading PhonePe's whole
 * board four times.
 */
const BOARD_CACHE_MS = 5 * 60_000;
const boardCache = new Map<string, { at: number; body: Promise<string> }>();
function fetchBoard(url: string): Promise<string> {
  const hit = boardCache.get(url);
  if (hit && Date.now() - hit.at < BOARD_CACHE_MS) return hit.body;
  const body = fetchWithGuards(url, {}, { timeoutMs: 15_000, maxBytes: 12_000_000 });
  boardCache.set(url, { at: Date.now(), body });
  // A failed fetch must not be cached as the answer for the next run.
  body.catch(() => boardCache.delete(url));
  return body;
}

/** "razorpaysoftwareprivatelimited" -> the configured display name, else a readable version of the handle. */
function companyNameFor(config: Record<string, unknown>, boardToken: string): string {
  const configured = typeof config.companyName === "string" ? config.companyName.trim() : "";
  if (configured) return configured;
  const cleaned = boardToken
    .replace(/(softwareprivatelimited|privatelimited|technologies|inc|india|hq|careers|jobs)$/i, "")
    .replace(/[-_.]+/g, " ")
    .trim();
  return (cleaned || boardToken).replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * A company board returns EVERY open role - PhonePe or Atlassian can list
 * hundreds. Keep the ones in the field being searched for, put the ones in
 * the user's own city (or remote) first, then apply the limit. The old
 * code took the first N in the board's own order, so a data analyst's
 * search got the first 40 roles of whatever department sorted first.
 */
function pickForContext<T extends { title: string; location?: string | null; remote?: boolean }>(
  items: T[],
  context: IngestContext,
): T[] {
  // A company the user asked for by name ("everything at Stripe") skips
  // the field filter - the query is the company, not a job title.
  const query = context.config.allRoles === true ? "" : context.query?.trim();
  const inField = query ? items.filter((i) => titleIsRelevant(i.title, [query])) : items;
  const home = context.homeLocation?.trim();
  const score = (i: T) => (home && i.location && placeMatches(home, i.location) ? 2 : 0) + (i.remote ? 1 : 0);
  return [...inField].sort((a, b) => score(b) - score(a)).slice(0, context.limit);
}

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
  first_published?: string;
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

    const body = await fetchBoard(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
    );
    const parsed = JSON.parse(body) as { jobs?: GreenhouseJob[] };
    const company = companyNameFor(context.config, boardToken);
    const jobs = (parsed.jobs ?? []).map((job) => ({
      job,
      title: asString(job.title) ?? "Untitled role",
      location: asString(job.location?.name),
      remote: /remote/i.test(job.location?.name ?? ""),
    }));

    return pickForContext(jobs, context).map(({ job, title, location }) => ({
      externalId: `greenhouse:${boardToken}:${job.id ?? job.absolute_url ?? job.title}`,
      title,
      company,
      location,
      // Greenhouse returns HTML-escaped content; stripHtml in the shared
      // normalizer handles the tags, and this undoes the escaping first.
      description: job.content
        ? job.content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
        : null,
      url: asString(job.absolute_url),
      postedAt: asDate(job.first_published) ?? asDate(job.updated_at),
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
  workplaceType?: string;
  categories?: { location?: string; allLocations?: string[]; team?: string; commitment?: string };
}



/** Field names as documented at developers.ashbyhq.com/docs/public-job-posting-api. */
interface AshbyPosting {
  id?: string;
  title?: string;
  jobUrl?: string;
  applyUrl?: string;
  publishedAt?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  department?: string;
  team?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  employmentType?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
}

export const ashbySource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "COMPANY_CAREER",
  id: "ashby",
  name: "Ashby board",
  legalBasis:
    "Ashby publishes a keyless, read-only job posting API (api.ashbyhq.com/posting-api/job-board) intended for displaying a company's open roles on other sites. Read-only, one request per configured board.",
  requires: "The company's Ashby handle, e.g. the 'acme' in jobs.ashbyhq.com/acme",

  isConfigured(config) {
    return typeof config.boardToken === "string" && config.boardToken.trim().length > 0;
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const boardToken = String(context.config.boardToken ?? "").trim();
    if (!boardToken) return [];

    // Errors are NOT swallowed here: a wrong handle or an outage has to
    // show as "Error" on the source, not as a healthy board with 0 jobs.
    const body = await fetchBoard(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}`);
    const parsed = JSON.parse(body) as { jobs?: AshbyPosting[] };
    const company = companyNameFor(context.config, boardToken);

    const jobs = (parsed.jobs ?? [])
      .filter((job) => job.isListed !== false)
      .map((job) => {
        const places = [job.location, ...(job.secondaryLocations ?? []).map((l) => l.location)]
          .filter((l): l is string => Boolean(l?.trim()));
        const remote = job.isRemote === true || /remote/i.test(job.workplaceType ?? "");
        return { job, title: asString(job.title) ?? "Untitled role", location: places.join(" / ") || null, remote };
      });

    return pickForContext(jobs, context).map(({ job, title, location, remote }) => ({
      externalId: `ashby:${boardToken}:${job.id ?? job.jobUrl ?? job.title}`,
      title,
      company,
      location,
      description: asString(job.descriptionPlain) ?? asString(job.descriptionHtml),
      url: asString(job.jobUrl) ?? asString(job.applyUrl),
      postedAt: asDate(job.publishedAt),
      employmentTypeRaw: asString(job.employmentType),
      workModeRaw: remote ? "Remote" : asString(job.workplaceType),
      industry: asString(job.department) ?? asString(job.team),
    }));
  },
};

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

    const body = await fetchBoard(`https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`);
    const postings = JSON.parse(body) as LeverPosting[];
    const company = companyNameFor(context.config, boardToken);
    const jobs = (Array.isArray(postings) ? postings : []).map((posting) => {
      const places = posting.categories?.allLocations?.length
        ? posting.categories.allLocations
        : [posting.categories?.location].filter((l): l is string => Boolean(l));
      return {
        posting,
        title: asString(posting.text) ?? "Untitled role",
        location: places.join(" / ") || null,
        remote: posting.workplaceType === "remote" || /remote/i.test(places.join(" ")),
      };
    });

    return pickForContext(jobs, context).map(({ posting, title, location, remote }) => ({
      externalId: `lever:${boardToken}:${posting.id ?? posting.hostedUrl ?? posting.text}`,
      title,
      company,
      location,
      description: asString(posting.descriptionPlain),
      url: asString(posting.hostedUrl),
      postedAt: posting.createdAt ? new Date(posting.createdAt) : null,
      employmentTypeRaw: asString(posting.categories?.commitment),
      workModeRaw: remote ? "Remote" : asString(posting.workplaceType),
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
