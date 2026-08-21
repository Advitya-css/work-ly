import type { JobSource, RawJobListing } from "@/lib/jobs/types";

/**
 * The one job source Phase 1's data model could support: jobs a user adds
 * themselves. Not wired into any UI yet - the Opportunities page is a
 * placeholder - but registered here as the first concrete JobSource so the
 * discovery pipeline (a later phase) has something real to iterate on
 * beyond an empty interface.
 */
export const userSubmittedJobSource: JobSource = {
  id: "user-submitted",
  name: "User submitted",
  async fetchListings(): Promise<RawJobListing[]> {
    return [];
  },
};
