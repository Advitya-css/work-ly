import { fetchWithGuards, sourceDefaults, asString, asDate } from "@/lib/discovery/sources/base";
import type { IngestContext, JobSourceAdapter, RawListing } from "@/lib/discovery/types";

export const reedSource: JobSourceAdapter = {
  ...sourceDefaults,
  kind: "API_PROVIDER",
  id: "reed",
  name: "Reed.co.uk",
  legalBasis: "Reed publishes an official API for accessing UK job listings. Access requires a registered developer API key.",
  requires: "REED_API_KEY environment variable",

  isConfigured() {
    return Boolean(process.env.REED_API_KEY);
  },

  async ingest(context: IngestContext): Promise<RawListing[]> {
    const key = process.env.REED_API_KEY;
    if (!key) return [];

    const params = new URLSearchParams();
    if (context.query) params.set("keywords", context.query);
    if (context.homeLocation) params.set("locationName", context.homeLocation);
    
    // Reed specifically is a massive non-remote job board.
    const url = `https://www.reed.co.uk/api/1.0/search?${params.toString()}`;

    const response = await fetchWithGuards(url, {
      headers: {
        "Authorization": `Basic ${Buffer.from(key + ':').toString('base64')}`
      }
    });

    const parsed = JSON.parse(response);
    
    return (parsed.results || []).slice(0, context.limit).map((job: any) => ({
      externalId: `reed:${job.jobId}`,
      title: asString(job.jobTitle) ?? "Untitled role",
      company: asString(job.employerName),
      location: asString(job.locationName),
      description: asString(job.jobDescription),
      url: asString(job.jobUrl),
      postedAt: asDate(job.date),
      salaryMin: typeof job.minimumSalary === "number" ? job.minimumSalary : null,
      salaryMax: typeof job.maximumSalary === "number" ? job.maximumSalary : null,
      salaryCurrency: "GBP",
    }));
  }
};
