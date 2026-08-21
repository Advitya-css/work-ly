import type { DiscoveredJob, DiscoveryRun } from "@/lib/db/types";

/**
 * ALERTS - architecture only, per spec requirement #11.
 *
 * What exists: the computation. Given the last run and the current job
 * set, this produces the exact payload an alert would carry - the count,
 * the wording, and the jobs it refers to.
 *
 * What deliberately does NOT exist: any delivery channel. No email, no
 * push, no scheduler. Adding one means calling `buildAlert` from wherever
 * the delivery happens; nothing here needs to change.
 *
 * Kept pure and dependency-free so it can be called from a request, a
 * background job, or a future cron without modification.
 */

export interface DiscoveryAlert {
  /** Short line suitable for a notification. */
  headline: string;
  /** Longer body, if the channel supports one. */
  body: string;
  /** How many newly-discovered jobs triggered it. */
  count: number;
  jobIds: string[];
  /** False when there's nothing worth interrupting the user for. */
  shouldNotify: boolean;
}

/// Never interrupt someone for a single low-relevance listing.
const MIN_JOBS_TO_NOTIFY = 1;

export function buildAlert(run: DiscoveryRun | null, jobs: DiscoveredJob[]): DiscoveryAlert {
  if (!run || run.status !== "COMPLETED") {
    return { headline: "", body: "", count: 0, jobIds: [], shouldNotify: false };
  }

  // Jobs discovered by this run that scored into the top two bands. Uses
  // the cached recommendation, so no scoring happens here.
  const highPriority = jobs.filter(
    (job) =>
      !job.isDismissed &&
      !job.duplicateOfId &&
      (job.recommendation === "APPLY_NOW" || job.recommendation === "APPLY") &&
      new Date(job.discoveredAt).getTime() >= new Date(run.startedAt).getTime(),
  );

  const count = highPriority.length;
  if (count < MIN_JOBS_TO_NOTIFY) {
    return {
      headline: "",
      body: "",
      count: 0,
      jobIds: [],
      shouldNotify: false,
    };
  }

  const headline = `${count} new high-priority opportunit${count === 1 ? "y was" : "ies were"} discovered.`;
  const topTitles = highPriority
    .slice(0, 3)
    .map((job) => `${job.title}${job.company ? ` at ${job.company}` : ""}`);

  return {
    headline,
    body:
      topTitles.length > 0
        ? `Including ${topTitles.join(", ")}${count > topTitles.length ? `, and ${count - topTitles.length} more` : ""}.`
        : "",
    count,
    jobIds: highPriority.map((job) => job.id),
    shouldNotify: true,
  };
}
