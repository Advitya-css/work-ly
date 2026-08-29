import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

export const findworkSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "API_PROVIDER",
  id: "findwork",
  name: "Findwork.dev",
  legalBasis: "Findwork provides a documented developer API for querying their index of software roles.",
  requires: "FINDWORK_API_KEY environment variable",

  isConfigured() {
    return Boolean(process.env.FINDWORK_API_KEY);
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const key = process.env.FINDWORK_API_KEY;
    if (!key) return [];

    const params = new URLSearchParams();
    if (context.query) params.set("search", context.query);
    if (context.homeLocation) params.set("location", context.homeLocation);

    const url = `https://findwork.dev/api/jobs/?${params.toString()}`;

    const response = await fetchWithGuards(url, {
      headers: {
        "Authorization": `Token ${key}`
      }
    });

    const parsed = JSON.parse(response);
    
    return (parsed.results || []).slice(0, context.limit).map((job: any) => ({
      externalId: `findwork:${job.id}`,
      title: asString(job.role) ?? "Untitled role",
      company: asString(job.company_name),
      location: asString(job.location),
      description: asString(job.text),
      url: asString(job.url),
      postedAt: asDate(job.date_posted),
      workMode: job.remote ? "REMOTE" : "ONSITE",
      industry: asString(job.keywords?.join(", ")),
    }));
  }
};
