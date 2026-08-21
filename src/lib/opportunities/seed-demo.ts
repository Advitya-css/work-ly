"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { listJobsByUserId } from "@/lib/db/jobs";
import { submitParseAndAnalyzeJob } from "@/lib/jobs/analyze-job";
import { DEMO_JOBS } from "@/lib/opportunities/demo-jobs";

/**
 * Runs each fictional posting in demo-jobs.ts through the exact same
 * submit -> parse -> analyze -> prioritize pipeline a real pasted job goes
 * through - so the resulting Fit/Priority/gaps for demo data are real
 * output from the real engine, not canned numbers. Idempotent: skips any
 * demo job whose title+company the user already has, so clicking the
 * button twice doesn't create duplicates.
 */
export async function seedDemoOpportunitiesAction(): Promise<{ created: number; skipped: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const existingJobs = await listJobsByUserId(user.id);
  const existingKeys = new Set(
    existingJobs.map((j) => `${(j.title ?? "").toLowerCase()}::${(j.company ?? "").toLowerCase()}`),
  );

  let created = 0;
  let skipped = 0;

  for (const demoJob of DEMO_JOBS) {
    const key = `${demoJob.title.toLowerCase()}::${demoJob.company.toLowerCase()}`;
    if (existingKeys.has(key)) {
      console.error("Seed error for", demoJob.title, ":", result.error); skipped += 1;
      continue;
    }
    const result = await submitParseAndAnalyzeJob(user.id, { inputMethod: "PASTED_TEXT", text: demoJob.text });
    if ("error" in result) {
      console.error("Seed error for", demoJob.title, ":", result.error); skipped += 1;
      continue;
    }
    created += 1;
  }

  revalidatePath("/opportunities");
  revalidatePath("/analyze-job");
  return { created, skipped };
}
