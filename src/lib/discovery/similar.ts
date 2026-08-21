import { cosineSimilarity } from "@/lib/search/embeddings";
import type { DiscoveredJob, SeniorityLevel } from "@/lib/db/types";

/**
 * SIMILAR OPPORTUNITIES - spec requirement #9.
 *
 * Three tiers, because "similar jobs" as one undifferentiated list answers
 * the wrong question. What someone actually wants to know is:
 *
 *   READY NOW     - jobs like this that they already qualify for
 *   ONE STEP UP   - the same field, a level above; a realistic stretch
 *   TOWARD TARGET - further out, but on the path to where they said they
 *                   want to end up
 *
 * Similarity is vector-based (cheap, uses the stored embeddings) but the
 * TIER is decided by cached fit score and seniority distance - structural
 * facts, not text similarity. Using similarity alone would put a role
 * three levels above the user in the same bucket as one they could take
 * tomorrow.
 */

const SENIORITY_ORDER: SeniorityLevel[] = [
  "ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE",
];

/// Below this the jobs aren't really related and shouldn't be offered.
const MIN_SIMILARITY = 0.25;

export interface SimilarJob {
  job: DiscoveredJob;
  similarity: number;
}

export interface SimilarOpportunities {
  readyNow: SimilarJob[];
  oneStepUp: SimilarJob[];
  towardTarget: SimilarJob[];
}

function seniorityDistance(from: SeniorityLevel | null, to: SeniorityLevel | null): number | null {
  if (!from || !to) return null;
  return SENIORITY_ORDER.indexOf(to) - SENIORITY_ORDER.indexOf(from);
}

export function findSimilarOpportunities(
  reference: DiscoveredJob,
  pool: DiscoveredJob[],
  options: { limitPerTier?: number } = {},
): SimilarOpportunities {
  const limit = options.limitPerTier ?? 4;

  const candidates = pool
    .filter(
      (job) =>
        job.id !== reference.id &&
        !job.isDismissed &&
        !job.duplicateOfId &&
        job.embedding.length > 0 &&
        reference.embedding.length > 0,
    )
    .map((job) => ({ job, similarity: cosineSimilarity(reference.embedding, job.embedding) }))
    .filter((entry) => entry.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity);

  const readyNow: SimilarJob[] = [];
  const oneStepUp: SimilarJob[] = [];
  const towardTarget: SimilarJob[] = [];

  for (const entry of candidates) {
    const distance = seniorityDistance(reference.seniority, entry.job.seniority);
    const fit = entry.job.fitScore ?? 0;

    // Already qualified: strong cached fit, and not pitched above them.
    if (fit >= 70 && (distance == null || distance <= 0)) {
      if (readyNow.length < limit) readyNow.push(entry);
      continue;
    }
    // Exactly one level up, OR same level but missing skills (medium fit), is a "stretch" goal.
    if (distance === 1 || ((distance == null || distance <= 0) && fit >= 50 && fit < 70)) {
      if (oneStepUp.length < limit) oneStepUp.push(entry);
      continue;
    }
    // Further out - still in the same space, worth knowing about as a
    // direction rather than an application.
    if (distance != null && distance >= 2) {
      if (towardTarget.length < limit) towardTarget.push(entry);
    }
  }

  return { readyNow, oneStepUp, towardTarget };
}
