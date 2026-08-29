"use server";

/**
 * A student-specific entry point into Discovery.
 *
 * This deliberately does NOT duplicate the discovery engine (that mistake
 * already exists once in this codebase - see the retired
 * /api/student/live-jobs prototype, which bypassed scoring, dedup and
 * persistence and could return fake mock listings). Instead it drives the
 * same runDiscoveryAction()/runDiscovery() pipeline every other part of
 * the app uses, then closes the one real gap for students: a discovered
 * job used to just sit in the "Discover" inbox until someone manually hit
 * "Track" on it, so the student dashboard's on-campus/off-campus/
 * internship lists (which only ever show tracked Opportunity rows) stayed
 * empty even after a successful run. This auto-tracks the best few
 * student-relevant results, through the exact same trackDiscoveredJobAction
 * a manual click would call, so a promoted job gets a real analysis and
 * priority score identical to one a person tracked by hand.
 */

import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCareerProfileByUserId } from "@/lib/db/career-profile";
import { listDiscoveredJobsByUserId } from "@/lib/db/discovery";
import { runDiscoveryAction, trackDiscoveredJobAction } from "@/lib/discovery/actions";
import { classifyStudentJob, type StudentJobKind } from "@/lib/student/legal-limits";

export type StudentDiscoveryType = "part-time" | "internship" | "new-grad";

const MAX_AUTO_TRACKED = 5;

function queryFor(type: StudentDiscoveryType, major: string | null): string {
  if (type === "internship") return major ? `${major} internship` : "internship";
  if (type === "new-grad") return major ? `${major} graduate entry level` : "graduate entry level";
  return "part time";
}

/** Which classifyStudentJob() buckets count as "relevant" for each dashboard. */
function relevantKinds(type: StudentDiscoveryType): (StudentJobKind | "wrong-location")[] {
  if (type === "internship") return ["internship"];
  if (type === "new-grad") return ["off-campus", "internship"];
  return ["on-campus", "off-campus"];
}

export interface StudentDiscoveryResult {
  error?: string;
  upgradeRequired?: boolean;
  found?: number;
  tracked?: number;
}

export async function runStudentDiscoveryAndTrackAction(
  type: StudentDiscoveryType,
): Promise<StudentDiscoveryResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getCareerProfileByUserId(user.id);

  // Snapshot which discovered jobs already exist before this run, so we
  // can tell what's genuinely new afterwards without relying on timing.
  const before = await listDiscoveredJobsByUserId(user.id);
  const beforeIds = new Set(before.map((j) => j.id));

  const run = await runDiscoveryAction(queryFor(type, profile?.major ?? null));
  if (run.error || run.upgradeRequired) {
    return { error: run.error, upgradeRequired: run.upgradeRequired };
  }

  const after = await listDiscoveredJobsByUserId(user.id);
  const kinds = relevantKinds(type);

  const candidates = after
    .filter((job) => !beforeIds.has(job.id))
    .filter((job) => !job.isDismissed && !job.convertedOpportunityId)
    .filter((job) =>
      kinds.includes(
        classifyStudentJob({
          title: job.title,
          company: job.company,
          employmentType: job.employmentType,
          description: job.description,
          location: job.location,
          university: profile?.university ?? null,
        }),
      ),
    )
    .filter((job) => job.recommendation === "APPLY_NOW" || job.recommendation === "APPLY" || job.recommendation === "STRETCH")
    .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0))
    .slice(0, MAX_AUTO_TRACKED);

  let tracked = 0;
  for (const job of candidates) {
    const result = await trackDiscoveredJobAction(job.id);
    if (!result.error) tracked++;
  }

  return { found: run.found, tracked };
}
