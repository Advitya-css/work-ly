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

/**
 * Jobicy returns some fields (notably `jobIndustry`, and sometimes
 * `jobType`) as an array of strings rather than a single string. Treating
 * either shape as plain text - rather than assuming it's always a string,
 * which crashed keyword search with a `.toLowerCase is not a function`
 * TypeError the moment a listing had an array here - keeps this adapter
 * working regardless of which shape a given listing uses.
 */
function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").join(" ");
  return "";
}

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
        textOf(j.jobTitle).toLowerCase().includes(kw) ||
        textOf(j.companyName).toLowerCase().includes(kw) ||
        textOf(j.jobIndustry).toLowerCase().includes(kw)
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
      employmentTypeRaw: asString(job.jobType) ?? (textOf(job.jobType) || null),
      workModeRaw: "REMOTE",
      industry: asString(job.jobIndustry) ?? (textOf(job.jobIndustry) || null),
    }));
  },
};

// --- HIMALAYAS ---
export const himalayasSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "himalayas",
  name: "Himalayas",
  legalBasis: "Himalayas publishes an open, keyless JSON API (himalayas.app/jobs/api) for public consumption.",
  isConfigured() { return true; },
  async ingest(context: IngestContext): Promise<RawListing[]> {
    const keyword = context.query?.trim() || "";
    const url = `https://himalayas.app/jobs/api?limit=${Math.min(context.limit, 50)}`;
    const body = await fetchWithGuards(url);
    const parsed = JSON.parse(body);
    let jobs = parsed.jobs ?? [];
    if (keyword) {
      const kw = keyword.toLowerCase();
      jobs = jobs.filter((j: any) =>
        textOf(j.title).toLowerCase().includes(kw) ||
        textOf(j.companyName).toLowerCase().includes(kw) ||
        textOf(j.excerpt).toLowerCase().includes(kw)
      );
    }
    return jobs.map((job: any) => ({
      externalId: `himalayas:${job.guid ?? job.applicationLink}`,
      title: asString(job.title) ?? "Untitled role",
      company: asString(job.companyName),
      location: asString(job.locationRestrictions?.[0]) ?? "Remote",
      description: job.description ? stripTags(job.description) : null,
      url: asString(job.applicationLink),
      postedAt: job.pubDate ? new Date(job.pubDate * 1000) : null,
      salaryMin: job.minSalary ? parseInt(job.minSalary, 10) : null,
      salaryMax: job.maxSalary ? parseInt(job.maxSalary, 10) : null,
      salaryCurrency: asString(job.currency) ?? "USD",
      employmentTypeRaw: asString(job.employmentType),
      workModeRaw: "REMOTE",
      industry: asString(job.categories?.[0]),
    }));
  },
};

// --- THE MUSE ---
export const museSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "themuse",
  name: "The Muse",
  legalBasis: "The Muse publishes a free public JSON API (themuse.com/api/public/jobs) for syndicating their job listings.",
  isConfigured() { return true; },
  async ingest(context: IngestContext): Promise<RawListing[]> {
    const keyword = context.query?.trim().toLowerCase() || "";
    // We'll fetch 2 pages to get up to 40 jobs, since we have to filter locally for keywords
    let allJobs: any[] = [];
    for (let page = 1; page <= 2; page++) {
      try {
        let url = `https://www.themuse.com/api/public/jobs?page=${page}`;
        const locationName = asString(context.config.locationName) || context.homeLocation;
        if (locationName) {
           // The Muse requires exact location matches for its API, but taking just the city or state helps.
           const city = locationName.split(',')[0].trim();
           url += `&location=${encodeURIComponent(city)}`;
        }
        const body = await fetchWithGuards(url);
        const parsed = JSON.parse(body);
        if (parsed.results && Array.isArray(parsed.results)) {
           allJobs = allJobs.concat(parsed.results);
        }
      } catch (e) {
        // Ignore pagination errors if we hit the end
      }
    }
    
    let filtered = allJobs;
    if (keyword) {
      filtered = filtered.filter((j: any) =>
        textOf(j.name).toLowerCase().includes(keyword) ||
        textOf(j.company?.name).toLowerCase().includes(keyword) ||
        textOf(j.contents).toLowerCase().includes(keyword)
      );
    }
    
    return filtered.slice(0, context.limit).map((job: any) => ({
      externalId: `themuse:${job.id}`,
      title: asString(job.name) ?? "Untitled role",
      company: asString(job.company?.name),
      location: asString(job.locations?.[0]?.name),
      description: job.contents ? stripTags(job.contents) : null,
      url: asString(job.refs?.landing_page),
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
      seniority: asString(job.levels?.[0]?.name),
      industry: asString(job.categories?.[0]?.name),
    }));
  },
};

// --- REMOTE OK ---
export const remoteokSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "remoteok",
  name: "Remote OK",
  legalBasis: "Remote OK provides an open JSON API (remoteok.com/api) specifically for syndication and external consumption.",
  isConfigured() { return true; },
  async ingest(context: IngestContext): Promise<RawListing[]> {
    const keyword = context.query?.trim() || "";
    const url = "https://remoteok.com/api";
    const body = await fetchWithGuards(url);
    const parsed = JSON.parse(body);
    let jobs = parsed.filter((j: any) => j.id); // Filter out the legal notice
    
    if (keyword) {
      const kw = keyword.toLowerCase();
      jobs = jobs.filter((j: any) =>
        textOf(j.position).toLowerCase().includes(kw) ||
        textOf(j.company).toLowerCase().includes(kw) ||
        (j.tags && j.tags.some((t: string) => t.toLowerCase().includes(kw)))
      );
    }
    
    return jobs.slice(0, context.limit).map((job: any) => ({
      externalId: `remoteok:${job.id}`,
      title: asString(job.position) ?? "Untitled role",
      company: asString(job.company),
      location: asString(job.location) ?? "Remote",
      description: job.description ? stripTags(job.description) : null,
      url: asString(job.url),
      postedAt: job.date ? new Date(job.date) : null,
      salaryMin: job.salary_min ? parseInt(job.salary_min, 10) : null,
      salaryMax: job.salary_max ? parseInt(job.salary_max, 10) : null,
      workModeRaw: "REMOTE",
    }));
  },
};

// --- WORKING NOMADS ---
export const workingNomadsSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "PUBLIC_JOB_BOARD",
  id: "workingnomads",
  name: "Working Nomads",
  legalBasis: "Working Nomads publishes an open, keyless JSON API (workingnomads.co/api/exposed_jobs/) for public consumption.",
  isConfigured() { return true; },
  async ingest(context: IngestContext): Promise<RawListing[]> {
    const keyword = context.query?.trim() || "";
    const url = "https://www.workingnomads.co/api/exposed_jobs/";
    const body = await fetchWithGuards(url);
    const jobs = JSON.parse(body) || [];
    
    let filtered = jobs;
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter((j: any) =>
        textOf(j.title).toLowerCase().includes(kw) ||
        textOf(j.company_name).toLowerCase().includes(kw) ||
        textOf(j.tags).toLowerCase().includes(kw)
      );
    }
    
    return filtered.slice(0, context.limit).map((job: any) => ({
      externalId: `workingnomads:${job.url}`,
      title: asString(job.title) ?? "Untitled role",
      company: asString(job.company_name),
      location: asString(job.location) ?? "Remote",
      description: job.description ? stripTags(job.description) : null,
      url: asString(job.url),
      postedAt: job.pub_date ? new Date(job.pub_date) : null,
      industry: asString(job.category_name),
      workModeRaw: "REMOTE",
    }));
  },
};
