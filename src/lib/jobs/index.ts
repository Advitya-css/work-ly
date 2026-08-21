import { userSubmittedJobSource } from "@/lib/jobs/providers/user-submitted";
import type { JobSource } from "@/lib/jobs/types";

export type { JobSource, RawJobListing } from "@/lib/jobs/types";

/** Registry of active job sources. Append future sources here (each behind its own JobSource implementation). */
export const jobSources: JobSource[] = [userSubmittedJobSource];
