import "server-only";

import { listDreamJobsByUserId, getDreamJobById } from "@/lib/db/dream-jobs";
import { getDreamJobAnalysisByDreamJobId } from "@/lib/db/dream-job-analyses";
import type { DreamJobWithAnalysis } from "@/lib/db/types";

/** Single place that stitches a DreamJob together with its DreamJobAnalysis - mirrors lib/opportunities/get-with-job.ts. */
export async function listDreamJobsWithAnalysisByUserId(userId: string): Promise<DreamJobWithAnalysis[]> {
  const dreamJobs = await listDreamJobsByUserId(userId);
  return Promise.all(
    dreamJobs.map(async (dreamJob) => ({
      ...dreamJob,
      analysis: dreamJob.status === "PARSED" ? await getDreamJobAnalysisByDreamJobId(dreamJob.id) : null,
    })),
  );
}

export async function getDreamJobWithAnalysisById(id: string): Promise<DreamJobWithAnalysis | null> {
  const dreamJob = await getDreamJobById(id);
  if (!dreamJob) return null;
  const analysis = dreamJob.status === "PARSED" ? await getDreamJobAnalysisByDreamJobId(dreamJob.id) : null;
  return { ...dreamJob, analysis };
}
