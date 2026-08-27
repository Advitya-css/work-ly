import { createHash } from "crypto";

import type { EmploymentType, SeniorityLevel, WorkMode } from "@/lib/db/types";
import { parseJobSync } from "@/lib/ai/providers/job-heuristic";
import { canonical as canonicalText } from "@/lib/text-utils";
import type { NormalizedListing, RawListing } from "@/lib/discovery/types";

/**
 * Shared normalization - the single place every source's output becomes
 * one internal structure.
 *
 * This is deliberately shared rather than per-adapter. Cross-source
 * deduplication only works if two adapters seeing the same job produce the
 * same dedupe key, and they can only do that if they normalize identically.
 * An adapter that rolled its own would silently break dedup for every job
 * it touches.
 *
 * Nothing here invents data. Where a source doesn't state a field, the
 * result is null - never a guess. The one piece of inference is skill and
 * requirement extraction from the description, which reuses the same
 * heuristic parser used everywhere else in Workly and only ever lifts text
 * that is literally present.
 */

const EMPLOYMENT_PATTERNS: [RegExp, EmploymentType][] = [
  [/\b(full[\s-]?time|permanent|fte)\b/i, "FULL_TIME"],
  [/\bpart[\s-]?time\b/i, "PART_TIME"],
  [/\b(contract|fixed[\s-]?term|temporary|interim)\b/i, "CONTRACT"],
  [/\b(intern|internship|placement)\b/i, "INTERNSHIP"],
  [/\b(freelance|consultant)\b/i, "FREELANCE"],
];

const WORK_MODE_PATTERNS: [RegExp, WorkMode][] = [
  [/\b(fully[\s-]?remote|remote|work from home|wfh|distributed)\b/i, "REMOTE"],
  [/\bhybrid\b/i, "HYBRID"],
  [/\b(on[\s-]?site|in[\s-]?office|in[\s-]?person)\b/i, "ONSITE"],
];

const SENIORITY_PATTERNS: [RegExp, SeniorityLevel][] = [
  [/\b(chief|c[eto]o|vp|vice president|head of|director)\b/i, "EXECUTIVE"],
  [/\bprincipal\b/i, "PRINCIPAL"],
  [/\b(staff|lead|manager)\b/i, "LEAD"],
  [/\bsenior|snr|sr\.?\b/i, "SENIOR"],
  [/\b(junior|jnr|jr\.?|associate)\b/i, "JUNIOR"],
  [/\b(intern|graduate|entry[\s-]?level|trainee|apprentice)\b/i, "ENTRY"],
  [/\b(mid[\s-]?level|intermediate)\b/i, "MID"],
];

function matchFirst<T>(text: string | null | undefined, patterns: [RegExp, T][]): T | null {
  if (!text) return null;
  for (const [pattern, value] of patterns) {
    if (pattern.test(text)) return value;
  }
  return null;
}

/** Strips HTML that feed-based sources routinely embed, without pulling in a parser dependency. */
export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// canonical lives in lib/text-utils.ts (no "server-only") so the
// browser-side search engine shares one implementation with server-side
// dedup - see the note there on why that equivalence matters.
export { canonical } from "@/lib/text-utils";

/**
 * Company names vary cosmetically across sources ("Acme, Inc." vs "Acme").
 * Trimming the common suffixes makes the dedupe key stable across them.
 */
export function canonicalCompany(company: string | null): string {
  if (!company) return "";
  return canonicalText(company)
    .replace(/\b(inc|llc|ltd|limited|plc|gmbh|corp|corporation|co|company|group|holdings)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Only the city matters for dedup - sources disagree on how much address detail to include. */
export function canonicalLocation(location: string | null): string {
  if (!location) return "";
  return canonicalText(location.split(/[,|/]/)[0] ?? "");
}

/**
 * First-pass duplicate bucket. Listings sharing a key are compared in
 * detail (see dedupe.ts) rather than assumed identical - a company can
 * genuinely run two same-titled roles in one city.
 */
export function buildDedupeKey(company: string | null, title: string, location: string | null): string {
  const basis = [canonicalCompany(company), canonicalText(title), canonicalLocation(location)].join("|");
  return createHash("sha1").update(basis).digest("hex").slice(0, 20);
}

function parseSalaryFromText(text: string): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  // Reuses the same currency handling as the job parser rather than a
  // second, subtly different implementation.
  const symbolMatch = text.match(
    /([$€£₹])\s?([\d,]+(?:\.\d+)?)\s*(?:k)?\s*(?:-|–|to)\s*([$€£₹])?\s?([\d,]+(?:\.\d+)?)\s*(?:k)?/i,
  );
  const codeMatch = text.match(
    /\b(USD|EUR|GBP|INR|CAD|AUD|CHF|JPY|SGD|NZD)\s?([\d,]+)\s*(?:-|–|to)\s*(?:[A-Z]{3}\s?)?([\d,]+)/i,
  );

  const toNumber = (raw: string) => {
    const n = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  if (codeMatch) {
    return {
      min: toNumber(codeMatch[2]),
      max: toNumber(codeMatch[3]),
      currency: codeMatch[1].toUpperCase(),
    };
  }
  if (symbolMatch) {
    const symbolToCode: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "₹": "INR" };
    return {
      min: toNumber(symbolMatch[2]),
      max: toNumber(symbolMatch[4]),
      currency: symbolToCode[symbolMatch[1]] ?? null,
    };
  }
  return { min: null, max: null, currency: null };
}

/**
 * The shared normalizer. Adapters call this from their `normalize` method
 * and should not override it - see the class comment in types.ts.
 */
export function normalizeListing(raw: RawListing): NormalizedListing {
  const description = raw.description ? stripHtml(raw.description) : null;
  const haystack = [raw.title, raw.employmentTypeRaw, raw.workModeRaw, raw.location, description]
    .filter(Boolean)
    .join(" \n ");

  // Seniority is read from the title first: a title is an explicit
  // statement of level, whereas a description mentioning "senior
  // stakeholders" is not.
  const seniority =
    matchFirst(raw.seniorityRaw, SENIORITY_PATTERNS) ??
    matchFirst(raw.title, SENIORITY_PATTERNS) ??
    matchFirst(description, SENIORITY_PATTERNS);

  const salaryStated =
    raw.salaryMin != null || raw.salaryMax != null
      ? { min: raw.salaryMin ?? null, max: raw.salaryMax ?? null, currency: raw.salaryCurrency ?? null }
      : description
        ? parseSalaryFromText(description)
        : { min: null, max: null, currency: null };

  // Skills/requirements come from the same heuristic extractor the rest of
  // Workly uses, so a discovered job scores identically to one the user
  // pasted in by hand.
  let requiredSkills: string[] = [];
  let preferredSkills: string[] = [];
  let requirements: NormalizedListing["requirements"] = [];
  if (description && description.length > 40) {
    try {
      // Synchronous in practice - the heuristic provider does no I/O - but
      // typed as a promise by the shared interface, so results are read
      // opportunistically and a failure just leaves the lists empty rather
      // than failing the whole ingest.
      const parsed = parseJobSync(description);
      requiredSkills = parsed.requiredSkills ?? [];
      preferredSkills = parsed.preferredSkills ?? [];
      requirements = parsed.requirements ?? [];
    } catch {
      // Extraction is a bonus, never a reason to drop a real listing.
    }
  }

  return {
    externalId: raw.externalId,
    title: raw.title.trim(),
    company: raw.company?.trim() || null,
    location: raw.location?.trim() || null,
    country: raw.country?.trim() || null,
    salaryMin: salaryStated.min,
    salaryMax: salaryStated.max,
    salaryCurrency: salaryStated.currency,
    employmentType: matchFirst(raw.employmentTypeRaw ?? haystack, EMPLOYMENT_PATTERNS),
    workMode: matchFirst(raw.workModeRaw ?? haystack, WORK_MODE_PATTERNS),
    seniority,
    industry: raw.industry?.trim() || null,
    description,
    requiredSkills,
    preferredSkills,
    requirements,
    sourceUrl: raw.url?.trim() || null,
    postedAt: raw.postedAt ?? null,
    dedupeKey: buildDedupeKey(raw.company ?? null, raw.title, raw.location ?? null),
  };
}

/** Async wrapper for adapters whose description parsing genuinely needs to await. */
export async function normalizeListingAsync(raw: RawListing): Promise<NormalizedListing> {
  const base = normalizeListing(raw);
  if (base.requiredSkills.length > 0 || !base.description || base.description.length <= 40) {
    return base;
  }
  try {
    const parsed = parseJobSync(base.description);
    return {
      ...base,
      requiredSkills: parsed.requiredSkills ?? [],
      preferredSkills: parsed.preferredSkills ?? [],
      requirements: parsed.requirements ?? [],
    };
  } catch {
    return base;
  }
}

/**
 * Whether a listing's own text actually contains the search query.
 *
 * Several adapters (feeds, company-career boards, and the demo feed's
 * "nothing matched, show everything" fallback) return their listings
 * unfiltered by query - they don't support keyword search at all. Without
 * this check, run.ts labeled EVERY listing surfaced during a query-driven
 * run "Matched your search", including ones that share nothing with what
 * was typed - exactly the kind of invented relevance claim this app is not
 * supposed to make. Lives here (not in run.ts, which is server-only) so
 * it's directly testable without spinning up a full discovery run.
 */
export function listingMatchesQueryLiterally(listing: NormalizedListing, query: string): boolean {
  const haystack = `${listing.title} ${listing.description ?? ""} ${listing.company ?? ""}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}
