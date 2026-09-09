import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

export const joobleSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "API_PROVIDER",
  id: "jooble",
  name: "Jooble",
  legalBasis: "Jooble provides a commercial search API for partners and developers.",
  requires: "JOOBLE_API_KEY environment variable",

  isConfigured() {
    return Boolean(process.env.JOOBLE_API_KEY);
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const key = process.env.JOOBLE_API_KEY;
    if (!key) return [];

    const loc = context.homeLocation || "";

    // Jooble's public API doesn't expose a documented employment-type
    // filter, so - same idea as Adzuna's `what` bias just above it in this
    // file tree - Part-Time Mode / Gig & Musician Mode bias the keyword
    // search itself toward those categories rather than doing nothing.
    let keywords = context.query || "";
    if (context.isFreelanceMode) {
      keywords = keywords ? `${keywords} freelance contract` : "freelance contract gig";
    }
    if (context.isPartTimeMode) {
      keywords = keywords ? `${keywords} part-time` : "part-time";
    }

    const body = JSON.stringify({
      keywords,
      location: loc,
      page: 1
    });

    const response = await fetchWithGuards(`https://jooble.org/api/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    const parsed = JSON.parse(response);
    
    return (parsed.jobs || []).slice(0, context.limit).map((job: any) => ({
      externalId: `jooble:${job.id}`,
      title: asString(job.title) ?? "Untitled role",
      company: asString(job.company),
      location: asString(job.location),
      description: asString(job.snippet),
      url: asString(job.link),
      postedAt: asDate(job.updated),
      salaryMin: typeof job.salary === 'string' ? null : null, // Jooble salary format is messy
    }));
  }
};
