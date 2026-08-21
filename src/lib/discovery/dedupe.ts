import { canonical, canonicalCompany, canonicalLocation } from "@/lib/discovery/normalize";
import type { NormalizedListing } from "@/lib/discovery/types";

/**
 * CROSS-SOURCE DEDUPLICATION
 *
 * The same job reaches Workly from several directions: the company's ATS
 * board, an aggregator API, an RSS feed, and possibly the user pasting it
 * in. Showing it five times is the single fastest way to make a discovery
 * feed useless, so this runs on every ingest.
 *
 * Signals, in order of trustworthiness:
 *
 *   1. Source URL - the same canonical URL is the same posting, full stop.
 *   2. Company + title + location - the dedupe key. Strong, but NOT
 *      conclusive: a company can legitimately run two same-titled roles in
 *      one city on different teams.
 *   3. Description similarity - the tiebreaker for (2). Two postings that
 *      share a key AND read alike are the same job; two that share a key
 *      but describe different work are not.
 *
 * Deliberately conservative. Wrongly merging two genuinely different jobs
 * hides an opportunity the user never learns existed, which is worse than
 * showing one duplicate - so ambiguous cases stay separate.
 */

const SIMILARITY_THRESHOLD = 0.62;
/// Below this, a description is too short for similarity to mean anything,
/// so the key alone decides.
const MIN_LENGTH_FOR_SIMILARITY = 120;

/** Normalizes away the tracking parameters and cosmetic differences aggregators add. */
export function canonicalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // utm_*, gh_src, ref and friends differ per source for the same posting.
    const keep = new URLSearchParams();
    for (const [key, value] of parsed.searchParams) {
      if (/^(utm_|gh_|ref|source|src|from)/i.test(key)) continue;
      keep.set(key, value);
    }
    parsed.search = keep.toString();
    const normalized = `${parsed.host.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}${
      parsed.search
    }`;
    return normalized.toLowerCase();
  } catch {
    return url.trim().toLowerCase() || null;
  }
}

const DEDUPE_STOPWORDS = new Set([
  "the", "and", "with", "this", "that", "for", "from", "you", "are", "our",
  "will", "your", "have", "we", "can", "but", "not", "what", "all", "were",
  "when", "how", "why", "who", "which", "there", "their", "they", "them",
  "about", "would", "could", "should", "has", "had", "been", "was", "were",
  "experience", "work", "role", "team", "looking", "candidate", "job", "join"
]);

function tokenSet(text: string): Set<string> {
  return new Set(
    canonical(text)
      .split(" ")
      .filter((token) => token.length > 2 && !DEDUPE_STOPWORDS.has(token)),
  );
}

/**
 * Jaccard overlap over token sets. Chosen over edit distance because
 * postings for the same role are frequently reordered or truncated by
 * aggregators - word overlap survives that, character distance doesn't.
 */
export function descriptionSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared++;
  const union = setA.size + setB.size - shared;
  return union === 0 ? 0 : shared / union;
}

export interface DuplicateCandidate {
  id: string;
  dedupeKey: string;
  sourceUrl: string | null;
  company: string | null;
  title: string;
  location: string | null;
  description: string | null;
}

/** Why two listings were judged the same - surfaced so the merge is explainable. */
export type DuplicateReason = "same-url" | "same-role-and-description" | "same-role-short-listing";

export function isDuplicate(
  a: DuplicateCandidate | NormalizedListing & { id?: string },
  b: DuplicateCandidate,
): { duplicate: boolean; reason: DuplicateReason | null; similarity: number } {
  const urlA = canonicalUrl(a.sourceUrl ?? null);
  const urlB = canonicalUrl(b.sourceUrl);
  if (urlA && urlB && urlA === urlB) {
    return { duplicate: true, reason: "same-url", similarity: 1 };
  }

  const sameRole =
    canonicalCompany(a.company ?? null) === canonicalCompany(b.company) &&
    canonical(a.title) === canonical(b.title) &&
    canonicalLocation(a.location ?? null) === canonicalLocation(b.location);

  if (!sameRole) return { duplicate: false, reason: null, similarity: 0 };

  const similarity = descriptionSimilarity(a.description ?? null, b.description);
  
  if (similarity >= SIMILARITY_THRESHOLD) {
    return { duplicate: true, reason: "same-role-and-description", similarity };
  }

  // If they have the same role/company/location but descriptions don't match,
  // they are likely different headcount/reqs. We do not unconditionally fold
  // them even if one is short, to avoid merging distinct generic roles.
  return { duplicate: false, reason: null, similarity };
}

/**
 * Collapses duplicates within a single batch, before anything is written.
 * Cross-batch dedup against already-stored jobs happens in run.ts, which
 * has database access.
 */
export function deduplicateBatch(listings: NormalizedListing[]): {
  unique: NormalizedListing[];
  folded: number;
} {
  const unique: NormalizedListing[] = [];
  let folded = 0;

  for (const listing of listings) {
    const existing = unique.find(
      (candidate) =>
        isDuplicate(listing, {
          id: candidate.externalId,
          dedupeKey: candidate.dedupeKey,
          sourceUrl: candidate.sourceUrl,
          company: candidate.company,
          title: candidate.title,
          location: candidate.location,
          description: candidate.description,
        }).duplicate,
    );

    if (existing) {
      folded++;
      // Keep whichever version carries more information - an aggregator
      // stub shouldn't win over the employer's full posting.
      if ((listing.description?.length ?? 0) > (existing.description?.length ?? 0)) {
        unique[unique.indexOf(existing)] = listing;
      }
      continue;
    }
    unique.push(listing);
  }

  return { unique, folded };
}
