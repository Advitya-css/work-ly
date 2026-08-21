import { fetchWithGuards, sourceDefaults, asString } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

/**
 * KEYLESS PUBLIC JOB BOARDS.
 *
 * Every other real (non-demo) source needs something from the user first: a
 * board token, a feed URL, a registered API key. That is fine once someone
 * is set up, but it means a brand-new account's very first look at
 * Discovery is the bundled demo feed, clearly fictional, or nothing at all.
 *
 * A small number of boards publish a fully open, keyless JSON API precisely
 * so other products can list their postings with no signup at all. Wiring
 * one of those in is what lets a new user see real, current listings on
 * day one without configuring anything.
 *
 * LEGAL BASIS: Arbeitnow documents this endpoint (arbeitnow.com/api/job-board-api)
 * as public and free, explicitly for third-party consumption, no
 * registration or key required. Reading it is the API's stated purpose.
 */

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const arbeitnowSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "arbeitnow",
  name: "Arbeitnow",
  legalBasis:
    "Arbeitnow publishes an open, keyless JSON API (arbeitnow.com/api/job-board-api) specifically so other products can list its postings. No account, no key, no anti-bot bypass - reading it is the API's documented, intended use.",

  isConfigured() {
    // Genuinely zero-config: no key, no URL, nothing the user has to supply.
    return true;
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const body = await fetchWithGuards("https://www.arbeitnow.com/api/job-board-api");
    const parsed = JSON.parse(body) as { data?: ArbeitnowJob[] };
    const jobs = parsed.data ?? [];

    const keyword = context.query?.toLowerCase().trim();
    const filtered = keyword
      ? jobs.filter((job) =>
          [job.title, job.company_name, ...(job.tags ?? [])]
            .filter((field): field is string => Boolean(field))
            .some((field) => field.toLowerCase().includes(keyword)),
        )
      : jobs;

    return filtered.slice(0, context.limit).map((job) => ({
      externalId: `arbeitnow:${job.slug ?? job.url ?? job.title}`,
      title: asString(job.title) ?? "Untitled role",
      company: asString(job.company_name),
      location: job.remote ? "Remote" : asString(job.location),
      description: job.description ? stripTags(job.description) : null,
      url: asString(job.url),
      postedAt: job.created_at ? new Date(job.created_at * 1000) : null,
      employmentTypeRaw: job.job_types?.[0] ?? null,
      workModeRaw: job.remote ? "REMOTE" : null,
      industry: job.tags?.[0] ?? null,
    }));
  },
};
