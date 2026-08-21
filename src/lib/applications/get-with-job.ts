import "server-only";

import { getApplicationById } from "@/lib/db/applications";
import { getJobById } from "@/lib/db/jobs";
import { getJobAnalysisById } from "@/lib/db/job-analyses";
import { getOpportunityById } from "@/lib/db/opportunities";
import type { ApplicationWithJob } from "@/lib/db/types";

/**
 * Stitches an application together with its source job, analysis and
 * opportunity - all optional, because those rows can be deleted while the
 * application (and its outcome, which is the valuable part) survives.
 */
export async function getApplicationWithJobById(id: string): Promise<ApplicationWithJob | null> {
  const application = await getApplicationById(id);
  if (!application) return null;

  const [job, analysis, opportunity] = await Promise.all([
    application.jobId ? getJobById(application.jobId) : null,
    application.jobAnalysisId ? getJobAnalysisById(application.jobAnalysisId) : null,
    application.opportunityId ? getOpportunityById(application.opportunityId) : null,
  ]);

  return { ...application, job, analysis, opportunity };
}
