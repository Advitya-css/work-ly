import "server-only";

import { scoringProvider } from "@/lib/scoring";
import { getFullCareerProfile, type FullCareerProfile } from "@/lib/career/get-full-profile";
import { getPrimaryCareerGoal } from "@/lib/db/career-goals";
import {
  completeRun,
  createRun,
  listDiscoveredJobsByUserId,
  listSourcesByUserId,
  updateSourceStatus,
  upsertDiscoveredJob,
} from "@/lib/db/discovery";
import { getAdapter } from "@/lib/discovery/registry";
import { isDuplicate } from "@/lib/discovery/dedupe";
import { normalizeListingAsync } from "@/lib/discovery/normalize";
import { embeddingProvider, jobEmbeddingText } from "@/lib/search/embeddings";
import { expandQuery } from "@/lib/search/role-graph";
import type {
  CareerGoal,
  DiscoveredJob,
  DiscoveryRun,
  Job,
  MatchReason,
  RecommendationType,
} from "@/lib/db/types";
import type { NormalizedListing } from "@/lib/discovery/types";
import { profileSearchText } from "@/lib/discovery/profile-text";

/**
 * THE DISCOVERY RUN
 *
 * ingest → validate → normalize → dedupe (in-batch, then against stored) →
 * embed → score → persist.
 *
 * PERFORMANCE (Phase 8 requirement #12)
 *
 * Everything expensive happens exactly once, here, during an explicit run:
 * embeddings are computed and stored, fit is scored and cached onto the
 * row. Rendering the discovery page afterwards is a single indexed SELECT
 * plus in-memory ranking over already-stored vectors - no AI calls, no
 * network, no per-request analysis. A page showing 173 listings must not
 * run 173 analyses, and it doesn't.
 *
 * This is written as an awaited async function rather than a queued job
 * because Workly has no worker process. The seam is deliberate: everything
 * below is pure orchestration over the database, so moving it behind a
 * queue later means changing the caller, not this function.
 */

/** Reuses the Phase 3 fit engine so a discovered job scores exactly like a pasted one. */
function toJobLike(listing: NormalizedListing, userId: string): Job {
  const now = new Date();
  return {
    id: `discovered:${listing.externalId}`,
    userId,
    inputMethod: "PASTED_TEXT",
    url: listing.sourceUrl,
    rawInput: listing.description ?? "",
    status: "PARSED",
    errorMessage: null,
    title: listing.title,
    company: listing.company,
    location: listing.location,
    country: listing.country,
    salaryMin: listing.salaryMin,
    salaryMax: listing.salaryMax,
    salaryCurrency: listing.salaryCurrency,
    employmentType: listing.employmentType,
    workMode: listing.workMode,
    seniority: listing.seniority,
    description: listing.description,
    requiredExperienceYears: null,
    preferredExperienceYears: null,
    education: null,
    industry: listing.industry,
    deadline: null,
    datePosted: listing.postedAt,
    source: null,
    requiredSkills: listing.requiredSkills,
    preferredSkills: listing.preferredSkills,
    requirements: listing.requirements,
    createdAt: now,
    updatedAt: now,
  };
}

function buildMatchReasons(
  listing: NormalizedListing,
  fitStrengths: string[],
  expansionRole: string | null,
  sourceName: string,
  openToRemote: boolean = true,
): MatchReason[] {
  const reasons: MatchReason[] = [];

  if (expansionRole) {
    reasons.push({
      kind: "expansion",
      text: `Surfaced as a related role (${expansionRole}) rather than a literal keyword match.`,
    });
  }
  for (const strength of fitStrengths.slice(0, 2)) {
    reasons.push({ kind: "skill", text: strength });
  }
  if (listing.workMode === "REMOTE") {
    if (openToRemote) {
      reasons.push({ kind: "location", text: "Remote, so location isn't a constraint." });
    } else {
      reasons.push({ kind: "location", text: "Remote job (Note: you are not currently open to remote)." });
    }
  }
  reasons.push({ kind: "source", text: `Found via ${sourceName}.` });

  return reasons;
}

export interface RunDiscoveryOptions {
  query?: string;
  /** Cap per source, so one prolific feed can't crowd out the rest. */
  limitPerSource?: number;
}

export async function runDiscovery(
  userId: string,
  options: RunDiscoveryOptions = {},
): Promise<DiscoveryRun> {
  const query = options.query?.trim() || undefined;
  const run = await createRun(userId, query ?? null);

  let sourcesRun = 0;
  let rawFound = 0;
  let duplicatesFolded = 0;
  let newJobs = 0;
  let newHighPriority = 0;

  try {
    const [profile, careerGoal, sources, existingJobs] = await Promise.all([
      getFullCareerProfile(userId),
      getPrimaryCareerGoal(userId),
      listSourcesByUserId(userId),
      listDiscoveredJobsByUserId(userId),
    ]);

    const profileText = profileSearchText(profile);
    const expansion = query ? expandQuery(query, profileText) : { literalTerms: [], expandedRoles: [], suppressed: [] };

    const activeSources = sources.filter((source) => source.status !== "DISABLED");

    // Collected across all sources first, so cross-source duplicates are
    // caught before anything is written.
    const collected: { listing: NormalizedListing; sourceConfigId: string; sourceName: string; sourceKind: DiscoveredJob["sourceKind"] }[] = [];

    for (const source of activeSources) {
      const adapter = getAdapter(inferAdapterId(source.kind, source.config));
      if (!adapter) continue;

      if (!adapter.isConfigured(source.config)) {
        await updateSourceStatus(source.id, {
          status: "NEEDS_CREDENTIALS",
          errorMessage: adapter.requires ? `Needs: ${adapter.requires}` : "Not configured yet.",
        });
        continue;
      }

      try {
        const raw = await adapter.ingest({
          query,
          config: source.config,
          limit: options.limitPerSource ?? 50,
        });
        rawFound += raw.length;
        sourcesRun++;

        const normalized: NormalizedListing[] = [];
        for (const item of raw) {
          const listing = await normalizeListingAsync(item);
          const validation = adapter.validate(listing);
          // Invalid listings are dropped rather than stored with holes -
          // showing a titleless entry would be worse than showing nothing.
          if (validation.ok) normalized.push(listing);
        }

        const { unique, folded } = adapter.deduplicate(normalized);
        duplicatesFolded += folded;

        for (const listing of unique) {
          collected.push({
            listing,
            sourceConfigId: source.id,
            sourceName: source.name,
            sourceKind: source.kind,
          });
        }

        await updateSourceStatus(source.id, adapter.updateStatus({ found: unique.length }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ingest failed.";
        // One broken source must not fail the whole run - the others still
        // have useful results, and the failure is recorded against that
        // source so the user can see which one is misbehaving.
        await updateSourceStatus(source.id, adapter.updateStatus({ found: 0, error: message }));
      }
    }

    // --- Cross-source dedup, then against what's already stored ----------
    const accepted: typeof collected = [];
    for (const candidate of collected) {
      const clashesInBatch = accepted.find(
        (other) =>
          isDuplicate(candidate.listing, {
            id: other.listing.externalId,
            dedupeKey: other.listing.dedupeKey,
            sourceUrl: other.listing.sourceUrl,
            company: other.listing.company,
            title: other.listing.title,
            location: other.listing.location,
            description: other.listing.description,
          }).duplicate,
      );
      if (clashesInBatch) {
        duplicatesFolded++;
        continue;
      }
      accepted.push(candidate);
    }

    for (const { listing, sourceConfigId, sourceName, sourceKind } of accepted) {
      const storedDuplicate = existingJobs.find(
        (stored) =>
          !stored.duplicateOfId &&
          stored.externalId !== listing.externalId &&
          isDuplicate(listing, {
            id: stored.id,
            dedupeKey: stored.dedupeKey,
            sourceUrl: stored.sourceUrl,
            company: stored.company,
            title: stored.title,
            location: stored.location,
            description: stored.description,
          }).duplicate,
      );

      let fit = null;
      let embedding = null;
      let matchedExpansion = null;
      let discoveryReason = query ? `Matched your search for "${query}".` : `Found by watching ${sourceName}.`;

      if (!storedDuplicate) {
        const jobLike = toJobLike(listing, userId);
        fit = scoringProvider.analyzeFit({ profile, careerGoal, job: jobLike });
        embedding = await embeddingProvider.embed(jobEmbeddingText(listing));
        
        matchedExpansion = expansion.expandedRoles.find((role) =>
          listing.title.toLowerCase().includes(role.role.toLowerCase()),
        ) ?? null;

        discoveryReason = matchedExpansion
          ? `You searched "${query}". ${matchedExpansion.rationale}`
          : discoveryReason;
      }

      const { isNew } = await upsertDiscoveredJob(userId, {
        sourceConfigId,
        sourceKind,
        sourceName,
        sourceUrl: listing.sourceUrl,
        externalId: listing.externalId,
        postedAt: listing.postedAt,
        title: listing.title,
        company: listing.company,
        location: listing.location,
        country: listing.country,
        salaryMin: listing.salaryMin,
        salaryMax: listing.salaryMax,
        salaryCurrency: listing.salaryCurrency,
        employmentType: listing.employmentType,
        workMode: listing.workMode,
        seniority: listing.seniority,
        industry: listing.industry,
        description: listing.description,
        requiredSkills: listing.requiredSkills,
        preferredSkills: listing.preferredSkills,
        requirements: listing.requirements,
        dedupeKey: listing.dedupeKey,
        duplicateOfId: storedDuplicate?.id ?? null,
        embedding,
        embeddingModel: embeddingProvider.name,
        fitScore: fit?.fitScore ?? null,
        recommendation: fit?.recommendation ?? null,
        matchReasons: buildMatchReasons(
          listing,
          fit?.strengths ?? [],
          matchedExpansion?.role ?? null,
          sourceName,
          profile.profile?.openToRemote ?? true,
        ),
        discoveryReason,
      });

      if (isNew && !storedDuplicate) {
        newJobs++;
        if (fit?.recommendation === "APPLY_NOW" || fit?.recommendation === "APPLY") newHighPriority++;
      }
      if (storedDuplicate) duplicatesFolded++;
    }

    return await completeRun(run.id, {
      status: "COMPLETED",
      sourcesRun,
      rawFound,
      duplicatesFolded,
      newJobs,
      newHighPriority,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed.";
    return completeRun(run.id, {
      status: "FAILED",
      sourcesRun,
      rawFound,
      duplicatesFolded,
      newJobs,
      newHighPriority,
      errorMessage: message,
    });
  }
}

/**
 * Maps a stored source's kind + config back to the adapter that handles it.
 * Config carries an explicit `adapterId` when the kind is ambiguous
 * (COMPANY_CAREER covers both Greenhouse and Lever).
 */
function inferAdapterId(kind: DiscoveredJob["sourceKind"], config: Record<string, unknown>): string {
  const explicit = typeof config.adapterId === "string" ? config.adapterId : null;
  if (explicit) return explicit;

  switch (kind) {
    case "DEMO":
      return "demo-feed";
    case "MANUAL_IMPORT":
      return "manual-import";
    case "COMPANY_CAREER":
      return "greenhouse";
    case "EMPLOYER_FEED":
      return "employer-feed";
    case "UNIVERSITY":
      return "university-feed";
    case "PUBLIC_JOB_BOARD":
      return "public-board-feed";
    case "GOVERNMENT":
      return "usajobs";
    case "API_PROVIDER":
      return "adzuna";
    default:
      return "demo-feed";
  }
}

// ---------------------------------------------------------------------------
// Bucketing - spec requirement #8
// ---------------------------------------------------------------------------

export interface DiscoveryBuckets {
  total: number;
  applyNow: DiscoveredJob[];
  strong: DiscoveredJob[];
  stretch: DiscoveredJob[];
  lowPriority: DiscoveredJob[];
}

/**
 * "173 opportunities discovered" is not useful on its own - it's a number
 * that induces paralysis. Splitting it into four bands with a clear top
 * tier is the entire point of the feature: the user should be able to look
 * at the page and know which seven to read.
 *
 * Uses the cached recommendation from the run, so this is a partition of an
 * array and nothing more.
 */
export function bucketJobs(jobs: DiscoveredJob[]): DiscoveryBuckets {
  const visible = jobs.filter((job) => !job.isDismissed && !job.duplicateOfId);
  const of = (...kinds: RecommendationType[]) =>
    visible.filter((job) => job.recommendation != null && kinds.includes(job.recommendation));

  return {
    total: visible.length,
    applyNow: of("APPLY_NOW"),
    strong: of("APPLY"),
    stretch: of("STRETCH"),
    lowPriority: of("LOW_PRIORITY", "SKIP"),
  };
}

export { profileSearchText };
export type { FullCareerProfile, CareerGoal };
