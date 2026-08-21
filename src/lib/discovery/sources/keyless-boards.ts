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

// --- REMOTIVE ---
export const remotiveSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "remotive",
  name: "Remotive",
  legalBasis: "Remotive publishes an open, keyless JSON API (remotive.com/api/remote-jobs) for public consumption.",
  isConfigured() { return true; },
  async ingest(context: IngestContext): Promise<RawListing[]> {
    const keyword = context.query?.trim() || "";
    const url = keyword ? `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}` : "https://remotive.com/api/remote-jobs?limit=100";
    const body = await fetchWithGuards(url);
    const parsed = JSON.parse(body);
    const jobs = parsed.jobs ?? [];
    return jobs.slice(0, context.limit).map((job: any) => ({
      externalId: `remotive:${job.id}`,
      title: asString(job.title) ?? "Untitled role",
      company: asString(job.company_name),
      location: asString(job.candidate_required_location),
      description: job.description ? stripTags(job.description) : null,
      url: asString(job.url),
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
      employmentTypeRaw: asString(job.job_type),
      workModeRaw: "REMOTE",
      industry: asString(job.category),
    }));
  },
};

// --- JOBICY ---
export const jobicySource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "jobicy",
  name: "Jobicy",
  legalBasis: "Jobicy publishes an open, keyless JSON API (jobicy.com/api/v2/remote-jobs) for public consumption.",
  isConfigured() { return true; },
  async ingest(context: IngestContext): Promise<RawListing[]> {
    const keyword = context.query?.trim() || "";
    const url = `https://jobicy.com/api/v2/remote-jobs?count=${Math.min(context.limit, 50)}`;
    const body = await fetchWithGuards(url);
    const parsed = JSON.parse(body);
    let jobs = parsed.jobs ?? [];
    if (keyword) {
      const kw = keyword.toLowerCase();
      jobs = jobs.filter((j: any) => 
        (j.jobTitle || "").toLowerCase().includes(kw) || 
        (j.companyName || "").toLowerCase().includes(kw) ||
        (j.jobIndustry || "").toLowerCase().includes(kw)
      );
    }
    return jobs.map((job: any) => ({
      externalId: `jobicy:${job.id}`,
      title: asString(job.jobTitle) ?? "Untitled role",
      company: asString(job.companyName),
      location: asString(job.jobGeo),
      description: job.jobDescription ? stripTags(job.jobDescription) : null,
      url: asString(job.url),
      postedAt: job.pubDate ? new Date(job.pubDate) : null,
      salaryMin: job.annualSalaryMin ? parseInt(job.annualSalaryMin, 10) : null,
      salaryMax: job.annualSalaryMax ? parseInt(job.annualSalaryMax, 10) : null,
      salaryCurrency: asString(job.salaryCurrency),
      employmentTypeRaw: asString(job.jobType),
      workModeRaw: "REMOTE",
      industry: asString(job.jobIndustry),
    }));
  },
};
