/**
 * Job source abstraction. Every source of job listings - a legitimate
 * partner API, an employer feed, or a user submitting a job manually -
 * implements this same interface, so discovery logic (a later phase)
 * never cares where a listing came from.
 *
 * Deliberately excluded, per project scope: unauthorized scraping of
 * LinkedIn or any other restricted site. Only legitimate APIs, employer
 * feeds, permitted public sources, and user submissions are in scope.
 */
export interface RawJobListing {
  sourceId: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  url: string;
  postedAt: Date | null;
}

export interface JobSource {
  readonly id: string;
  readonly name: string;
  fetchListings(): Promise<RawJobListing[]>;
}
