import { guardedFetch } from "@/lib/net/ssrf-guard";
import { deduplicateBatch } from "@/lib/discovery/dedupe";
import { normalizeListing } from "@/lib/discovery/normalize";
import type {
  JobSourceAdapter,
  NormalizedListing,
  RawListing,
  SourceStatusUpdate,
  ValidationResult,
} from "@/lib/discovery/types";

/**
 * Shared implementations of normalize/deduplicate/validate/updateStatus.
 *
 * Adapters get these by spreading `sourceDefaults` and only implement
 * `ingest`, which is the genuinely source-specific part. Keeping the other
 * four shared is what makes cross-source deduplication work at all -
 * see the note in types.ts.
 */

/**
 * Rejects listings that would be useless or misleading if stored. Erring
 * toward rejection here is right: a discovery feed padded with untitled
 * stubs from a malformed feed is worse than a shorter, trustworthy one.
 */
export function validateListing(listing: NormalizedListing): ValidationResult {
  const problems: string[] = [];

  if (!listing.externalId?.trim()) problems.push("Missing a stable identifier from the source.");
  if (!listing.title?.trim()) problems.push("Missing a job title.");
  if (listing.title && listing.title.trim().length > 300) problems.push("Title is implausibly long.");
  if (!listing.company && !listing.sourceUrl) {
    problems.push("No company and no URL. Nothing would let the user verify this listing.");
  }
  if (listing.postedAt && listing.postedAt.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) {
    problems.push("Posted date is in the future, which means the feed's dates can't be trusted.");
  }
  if (
    listing.salaryMin != null &&
    listing.salaryMax != null &&
    listing.salaryMin > listing.salaryMax
  ) {
    problems.push("Salary range is inverted.");
  }

  return { ok: problems.length === 0, problems };
}

export function defaultUpdateStatus(result: { found: number; error?: string }): SourceStatusUpdate {
  if (result.error) {
    return { status: "ERROR", errorMessage: result.error, foundCount: 0 };
  }
  return { status: "ACTIVE", errorMessage: null, foundCount: result.found };
}

export const sourceDefaults = {
  normalize(raw: RawListing): NormalizedListing {
    return normalizeListing(raw);
  },
  deduplicate(listings: NormalizedListing[]) {
    return deduplicateBatch(listings);
  },
  validate(listing: NormalizedListing): ValidationResult {
    return validateListing(listing);
  },
  updateStatus: defaultUpdateStatus,
} satisfies Pick<JobSourceAdapter, "normalize" | "deduplicate" | "validate" | "updateStatus">;

/**
 * Guarded fetch used by every network-backed adapter.
 *
 * Sets an explicit User-Agent (identifying the client is basic good
 * citizenship when consuming someone's feed), enforces a timeout so one
 * unresponsive source can't stall a discovery run, and caps response size
 * so a misbehaving endpoint can't exhaust memory.
 */
export async function fetchWithGuards(
  url: string,
  init: RequestInit = {},
  { timeoutMs = 10_000, maxBytes = 5_000_000 } = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // guardedFetch resolves and pins the connection to the address it just
    // validated (not just checks the hostname and lets a plain fetch()
    // re-resolve it, which a DNS answer changing between the two steps
    // slips past), and re-validates on every redirect hop rather than
    // rejecting redirects outright.
    const response = await guardedFetch(url, {
      method: (init.method as string | undefined) ?? "GET",
      headers: {
        "User-Agent": "Workly/0.1 (+career-intelligence; contact via app owner)",
        Accept: "application/json, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        ...(init.headers as Record<string, string> | undefined ?? {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Source returned HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          chunks.push(value);
          if (received > maxBytes) {
            await reader.cancel();
            throw new Error("Source response was unexpectedly large; refusing to process it.");
          }
        }
      }
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  } finally {
    clearTimeout(timer);
  }
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
