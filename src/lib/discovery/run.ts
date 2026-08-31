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
import { normalizeListingAsync, listingMatchesQueryLiterally } from "@/lib/discovery/normalize";
import { embeddingProvider, jobEmbeddingText } from "@/lib/search/embeddings";
import { expandQuery } from "@/lib/search/role-graph";
import { suggestTitlesForInterest, suggestIdealJobSearches } from "@/lib/ai/providers/interest-titles";
import { extractTargetCompany } from "@/lib/ai/providers/extract-company";
import { greenhouseSource, leverSource } from "@/lib/discovery/sources/company-career";
import { UNIVERSITY_ALIASES, UNIVERSITY_LOCATIONS } from "@/lib/student/legal-limits";
import { coverageOf } from "@/lib/scoring/coverage";
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
 * because Work-ly has no worker process. The seam is deliberate: everything
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

/** Search terms fan out beyond this many stop being added - keeps a single
 * Explore search from turning into an unbounded number of live API calls. */
export const MAX_SEARCH_TERMS = 4;

/**
 * Builds the deduped, capped list of search terms for one discovery run:
 * the literal query first (always kept, always searched even if empty
 * results would otherwise crowd it out), then role-graph expanded titles,
 * then AI-suggested titles - stopping once MAX_SEARCH_TERMS is reached.
 * Case-insensitive dedup so "Sustainability Analyst" from role-graph and
 * "sustainability analyst" from the AI don't both get searched.
 *
 * Pure and synchronous so it's testable without mocking the AI provider or
 * the database - see RunDiscoveryOptions.expandSearch's doc comment for the
 * feature this supports.
 */
export function buildSearchTerms(
  query: string | undefined,
  roleGraphTitles: string[],
  aiTitles: string[],
  max: number = MAX_SEARCH_TERMS,
): (string | undefined)[] {
  const terms: (string | undefined)[] = [query];
  if (!query) return terms;

  const seen = new Set([query.toLowerCase()]);
  for (const term of [...roleGraphTitles, ...aiTitles]) {
    if (terms.length >= max) break;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

export interface RunDiscoveryOptions {
  query?: string;
  /** Cap per source, so one prolific feed can't crowd out the rest. */
  limitPerSource?: number;
  /**
   * Interest-Based Explore mode: when true and `query` is set, the query
   * is expanded into real job titles (role-graph.ts's curated clusters,
   * plus an AI-suggested title translation when a real provider is
   * configured - see ai/providers/interest-titles.ts) and each title is
   * searched against every live source, not just the literal text typed.
   * Off by default so a plain keyword search behaves exactly as typed -
   * this is specifically for "I don't know what this is called" queries,
   * where searching only the literal phrase against a job board returns
   * little or nothing (see role-graph.ts's own doc comment for why).
   */
  expandSearch?: boolean;
}

/** `runDiscovery`'s DB row plus the search terms actually issued to live
 * sources this run - Explore mode's UI shows this back to the user so
 * "we searched for X, Y, Z" is a report of what really happened, not a
 * separate, uncapped, client-only expansion that can drift from it. */
export type DiscoveryRunResult = DiscoveryRun & { searchTermsUsed: string[] };

export async function runDiscovery(
  userId: string,
  options: RunDiscoveryOptions = {},
): Promise<DiscoveryRunResult> {
  const query = options.query?.trim() || undefined;
  const run = await createRun(userId, query ?? null);

  let sourcesRun = 0;
  let rawFound = 0;
  let duplicatesFolded = 0;
  let newJobs = 0;
  let newHighPriority = 0;
  // Populated as soon as it's computed below; stays [] if the run fails
  // before that point (nothing was actually searched yet).
  let searchTermsUsed: string[] = [];

  try {
    const [profile, careerGoal, sources, existingJobs] = await Promise.all([
      getFullCareerProfile(userId),
      getPrimaryCareerGoal(userId),
      listSourcesByUserId(userId),
      listDiscoveredJobsByUserId(userId),
    ]);

    const profileText = profileSearchText(profile);
    const expansion = query ? expandQuery(query, profileText) : { literalTerms: [], expandedRoles: [], suppressed: [] };

    // Interest-Based Explore mode's second step: translate the query into
    // real job titles and search live sources for each one, not just the
    // literal phrase - see RunDiscoveryOptions.expandSearch's doc comment
    // for why. Role-graph titles are deterministic and free; the AI
    // titles are a best-effort addition on top (empty when no real
    // provider is configured, or when the AI call fails - see
    // interest-titles.ts). buildSearchTerms caps the total and dedupes.
    const roleGraphTitles = options.expandSearch ? expansion.expandedRoles.map((r) => r.role) : [];
    const aiTitles = options.expandSearch && query ? await suggestTitlesForInterest(query) : [];
    
    let searchTerms = buildSearchTerms(query, roleGraphTitles, aiTitles);
    
    // SMART DEFAULT: If the user hit Discover without typing a query, don't just ask the job
    // board for "any job in this city" (which returns physicians and truck drivers). 
    // Proactively read their profile and search for highly targeted jobs.
    if (!query || query.trim() === "") {
      const idealTitles = await suggestIdealJobSearches(profileText, careerGoal?.primaryTargetRole ?? null);
      if (idealTitles.length > 0) {
        searchTerms = idealTitles;
      }
    }

    const isJunior = profile.profile?.isStudent || (profile.profile?.yearsExperience != null && profile.profile.yearsExperience < 3);
    let finalTerms = searchTerms.filter((t): t is string => Boolean(t));
    
    if (isJunior) {
      const biased = new Set<string>();
      for (const term of finalTerms) {
        if (!term) continue;
        const lower = term.toLowerCase();
        // If it already contains junior or entry, keep as is
        if (lower.includes("junior") || lower.includes("entry") || lower.includes("intern")) {
          biased.add(term);
        } else {
          biased.add(`Junior ${term}`);
          biased.add(`Entry Level ${term}`);
          biased.add(term); // keep original as fallback
        }
      }
      finalTerms = Array.from(biased);
    }
    
    searchTermsUsed = finalTerms.slice(0, 4); // Limit to avoid hitting rate limits on job boards

    // Computed once - doesn't vary per source or per search term.
    const homeLocation = (() => {
      if (profile.profile?.isStudent && profile.profile?.university) {
        let uni = profile.profile.university.toLowerCase().trim();
        if (UNIVERSITY_ALIASES[uni]) uni = UNIVERSITY_ALIASES[uni][0];
        else {
          for (const aliases of Object.values(UNIVERSITY_ALIASES) as string[][]) {
            if (aliases.includes(uni)) {
              uni = aliases[0];
              break;
            }
          }
        }
        const city = UNIVERSITY_LOCATIONS[uni]?.[0];
        // Adzuna API is already scoped by country in the URL. Passing ", Canada" in the 'where'
        // parameter breaks the API's geocoding for many cities. Just pass the raw city.
        if (city) return `${city}, ${profile.profile.studentCountry}`;
        return `${profile.profile.university}, ${profile.profile.studentCountry}`;
      }
      return profile.profile?.preferredLocations?.[0] || profile.profile?.location;
    })();

    const activeSources = sources.filter((source) => source.status !== "DISABLED");

    // Dynamically inject ATS sources if the user's query names a specific company
    if (query && options.expandSearch) {
      const companySlug = await extractTargetCompany(query);
      if (companySlug) {
        // Inject Greenhouse
        activeSources.push({
          id: `dynamic-greenhouse-${companySlug}`,
          userId,
          name: `${companySlug} (Greenhouse)`,
          kind: "COMPANY_CAREER",
          status: "ACTIVE",
          config: { boardToken: companySlug },
          legalBasis: "User-requested dynamic ATS search",
          errorMessage: null,
          lastRunAt: null,
          lastRunFoundCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        // Inject Lever
        activeSources.push({
          id: `dynamic-lever-${companySlug}`,
          userId,
          name: `${companySlug} (Lever)`,
          kind: "COMPANY_CAREER",
          status: "ACTIVE",
          config: { boardToken: companySlug },
          legalBasis: "User-requested dynamic ATS search",
          errorMessage: null,
          lastRunAt: null,
          lastRunFoundCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

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
        // Per-term limit shrinks as more terms fan out, so a 4-title
        // Explore search doesn't pull in 4x as many total candidates as a
        // plain single-term search.
        const perTermLimit = Math.max(10, Math.floor((options.limitPerSource ?? 50) / searchTerms.length));
        const rawBatches = await Promise.all(
          searchTerms.map((term) =>
            adapter.ingest({
              query: term,
              config: source.config,
              limit: perTermLimit,
              isPartTimeMode: profile.profile?.isPartTimeMode,
              // Was missing entirely: IngestContext declares isFreelanceMode and
              // the Adzuna adapter reads it to bias the search query toward
              // freelance/gig/contract roles and set the API's contract filter,
              // but nothing ever passed it in - so turning on Gig & Musician
              // Mode had zero effect on what discovery actually searched for.
              isFreelanceMode: profile.profile?.isFreelanceMode,
              homeLocation,
            }),
          ),
        );
        const raw = rawBatches.flat();
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
      const literalMatch = query != null && listingMatchesQueryLiterally(listing, query);
      let discoveryReason = literalMatch
        ? `Matched your search for "${query}".`
        : query
          ? `Found via ${sourceName} while you searched "${query}".`
          : `Found by watching ${sourceName}.`;

      // Always re-score so any profile updates or algorithm updates reflect on existing jobs
      const jobLike = toJobLike(listing, userId);
      fit = scoringProvider.analyzeFit({ profile, careerGoal, job: jobLike });
      
      if (!storedDuplicate) {
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
        // Lets the discovery feed withhold the fit badge for a listing
        // Work-ly couldn't actually assess, instead of showing the fitScore
        // the engine collapses to when coverage is insufficient (which
        // otherwise reads as a genuine, if low, score).
        fitCoverage: fit ? coverageOf(fit.scoreBreakdown) : null,
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

    const completed = await completeRun(run.id, {
      status: "COMPLETED",
      sourcesRun,
      rawFound,
      duplicatesFolded,
      newJobs,
      newHighPriority,
    });
    return { ...completed, searchTermsUsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed.";
    const failed = await completeRun(run.id, {
      status: "FAILED",
      sourcesRun,
      rawFound,
      duplicatesFolded,
      newJobs,
      newHighPriority,
      errorMessage: message,
    });
    return { ...failed, searchTermsUsed };
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
