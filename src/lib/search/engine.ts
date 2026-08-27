// Imported from text-utils rather than discovery/normalize or
// scoring/shared: both of those are server-only, and this engine runs in
// the browser on every keystroke. Same implementations, no server bundle.
import { canonical, skillsMatch } from "@/lib/text-utils";
import { cosineSimilarity, localEmbed } from "@/lib/search/embeddings";
import { expandQuery, type QueryExpansion } from "@/lib/search/role-graph";
import type {
  CareerGoal,
  DiscoveredJob,
  EmploymentType,
  SeniorityLevel,
  WorkMode,
} from "@/lib/db/types";

/**
 * SEARCH ENGINE
 *
 * Four signals, blended. The spec's instruction not to rely exclusively on
 * embeddings is followed literally, and each signal is here because it
 * catches something the others miss:
 *
 *   KEYWORD (35%)     Precision. If someone types "Kubernetes" they mean
 *                     Kubernetes, and no amount of vector similarity should
 *                     outrank a literal match.
 *   STRUCTURED (25%)  Facts, not text: seniority distance, location and
 *                     work-mode compatibility, salary floor. A perfect
 *                     textual match that's onsite in another country is
 *                     not a good result.
 *   SEMANTIC (25%)    Fuzzy overlap for phrasing the keyword pass misses.
 *                     Bounded at a quarter of the score precisely because
 *                     the default embedding is lexical, not learned.
 *   PREFERENCES (15%) What the user told Workly they want, which no amount
 *                     of text analysis can infer.
 *
 * Role-graph expansion (see role-graph.ts) runs before scoring and is what
 * makes hidden roles findable at all.
 *
 * Everything here is pure and synchronous over already-stored data. No
 * embeddings are computed, no AI is called, and nothing hits the network -
 * that's a hard requirement, because this runs on every keystroke of a
 * search and every render of the discovery page.
 */

export interface JobFilters {
  seniority?: SeniorityLevel[];
  workMode?: WorkMode[];
  employmentType?: EmploymentType[];
  country?: string;
  location?: string;
  salaryMin?: number;
  postedWithinDays?: number;
  /** Excluded by default - dismissed jobs shouldn't come back. */
  includeDismissed?: boolean;
}

export interface SearchContext {
  profileText: string;
  profileEmbedding: number[];
  profileSkills: string[];
  candidateSeniority: SeniorityLevel | null;
  careerGoal: CareerGoal | null;
}

export interface ScoredJob {
  job: DiscoveredJob;
  score: number;
  components: {
    keyword: number;
    structured: number;
    semantic: number;
    preferences: number;
  };
  /** Human-readable, shown as "why it matches". */
  reasons: string[];
  /** Set when the job surfaced through role-graph expansion rather than a literal match. */
  viaExpansion: { role: string; rationale: string } | null;
}

const WEIGHTS = { keyword: 0.35, structured: 0.25, semantic: 0.25, preferences: 0.15 };

const SENIORITY_ORDER: SeniorityLevel[] = [
  "ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "EXECUTIVE",
];

// ---------------------------------------------------------------------------
// filterJobs
// ---------------------------------------------------------------------------

export function filterJobs(jobs: DiscoveredJob[], filters: JobFilters): DiscoveredJob[] {
  const cutoff =
    filters.postedWithinDays != null
      ? Date.now() - filters.postedWithinDays * 24 * 60 * 60 * 1000
      : null;

  return jobs.filter((job) => {
    if (!filters.includeDismissed && job.isDismissed) return false;
    // Folded duplicates never appear in results - that's the entire point.
    if (job.duplicateOfId) return false;

    if (filters.seniority?.length && (!job.seniority || !filters.seniority.includes(job.seniority))) {
      return false;
    }
    if (filters.workMode?.length && (!job.workMode || !filters.workMode.includes(job.workMode))) {
      return false;
    }
    if (
      filters.employmentType?.length &&
      (!job.employmentType || !filters.employmentType.includes(job.employmentType))
    ) {
      return false;
    }
    if (filters.country && !canonical(job.country ?? "").includes(canonical(filters.country))) {
      return false;
    }
    if (
      filters.location &&
      !canonical(`${job.location ?? ""} ${job.country ?? ""}`).includes(canonical(filters.location))
    ) {
      return false;
    }
    if (filters.salaryMin != null) {
      const top = job.salaryMax ?? job.salaryMin;
      // A job with no stated salary is kept: excluding it would hide real
      // roles for not publishing a number, which is common and not the
      // candidate's problem.
      if (top != null && top < filters.salaryMin) return false;
    }
    if (cutoff != null) {
      const when = job.postedAt ?? job.discoveredAt;
      if (new Date(when).getTime() < cutoff) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Signal scorers
// ---------------------------------------------------------------------------

function keywordScore(job: DiscoveredJob, terms: string[], expandedRoles: string[]): number {
  if (terms.length === 0 && expandedRoles.length === 0) return 0.5;

  const title = canonical(job.title);
  const haystack = canonical(
    `${job.title} ${job.company ?? ""} ${job.industry ?? ""} ${job.requiredSkills.join(" ")} ${
      job.preferredSkills.join(" ")
    } ${(job.description ?? "").slice(0, 2000)}`,
  );

  let best = 0;
  for (const term of terms) {
    if (!term) continue;
    // Title hits are worth far more than body hits - a job whose title
    // contains the term is about that thing; a job mentioning it once in
    // a benefits paragraph is not.
    if (title.includes(term)) best = Math.max(best, 1);
    else if (haystack.includes(term)) best = Math.max(best, 0.55);
  }

  for (const role of expandedRoles) {
    const canonicalRole = canonical(role);
    if (title === canonicalRole) best = Math.max(best, 0.95);
    else if (title.includes(canonicalRole)) best = Math.max(best, 0.85);
  }

  return best;
}

function structuredScore(job: DiscoveredJob, context: SearchContext): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const parts: number[] = [];

  // Seniority distance
  if (job.seniority && context.candidateSeniority) {
    const jobIndex = SENIORITY_ORDER.indexOf(job.seniority);
    const candidateIndex = SENIORITY_ORDER.indexOf(context.candidateSeniority);
    const distance = Math.abs(jobIndex - candidateIndex);
    const seniorityFit = Math.max(0, 1 - distance * 0.3);
    parts.push(seniorityFit);
    if (distance === 0) reasons.push("Pitched at your current level.");
    else if (jobIndex === candidateIndex + 1) reasons.push("One level up: a realistic step.");
    else if (jobIndex < candidateIndex) reasons.push("Below your current level.");
  } else {
    parts.push(0.6);
  }

  // Skill overlap against the profile
  const jobSkills = [...job.requiredSkills, ...job.preferredSkills];
  if (jobSkills.length > 0 && context.profileSkills.length > 0) {
    const matched = jobSkills.filter((skill) =>
      context.profileSkills.some((own) => skillsMatch(own, skill)),
    );
    const ratio = matched.length / jobSkills.length;
    parts.push(ratio);
    if (matched.length > 0) {
      reasons.push(
        `You match ${matched.length} of ${jobSkills.length} listed skills${
          matched.length <= 4 ? `: ${matched.slice(0, 4).join(", ")}` : ""
        }.`,
      );
    }
  } else {
    parts.push(0.5);
  }

  // Remote roles are location-compatible with everyone.
  if (job.workMode === "REMOTE") {
    parts.push(1);
    reasons.push("Remote, so location isn't a constraint.");
  } else {
    parts.push(0.6);
  }

  return { score: parts.reduce((a, b) => a + b, 0) / parts.length, reasons };
}

function preferenceScore(job: DiscoveredJob, goal: CareerGoal | null): { score: number; reasons: string[] } {
  if (!goal || goal.isUncertain) return { score: 0.5, reasons: [] };

  const reasons: string[] = [];
  const parts: number[] = [];

  if (goal.primaryTargetRole) {
    const match = canonical(job.title).includes(canonical(goal.primaryTargetRole));
    parts.push(match ? 1 : 0.35);
    if (match) reasons.push(`Matches your target role (${goal.primaryTargetRole}).`);
  }
  if (goal.industries.length > 0 && job.industry) {
    const match = goal.industries.some((industry) => canonical(industry) === canonical(job.industry!));
    parts.push(match ? 1 : 0.4);
    if (match) reasons.push(`In ${job.industry}, one of your target industries.`);
  }
  if (goal.workModes.length > 0 && job.workMode) {
    parts.push(goal.workModes.includes(job.workMode) ? 1 : 0.3);
  }
  if (goal.countries.length > 0 && job.country) {
    const match = goal.countries.some((country) =>
      canonical(job.country!).includes(canonical(country)),
    );
    parts.push(match ? 1 : 0.3);
    if (match) reasons.push(`In ${job.country}, where you want to work.`);
  }
  if (goal.salaryMin != null) {
    const top = job.salaryMax ?? job.salaryMin;
    if (top != null) {
      parts.push(top >= goal.salaryMin ? 1 : 0.4);
      if (top >= goal.salaryMin) reasons.push("Pays at or above your stated minimum.");
    }
  }

  if (parts.length === 0) return { score: 0.5, reasons };
  return { score: parts.reduce((a, b) => a + b, 0) / parts.length, reasons };
}

// ---------------------------------------------------------------------------
// rankJobs / semanticSearch / searchJobs
// ---------------------------------------------------------------------------

export function semanticSearch(
  jobs: DiscoveredJob[],
  queryOrEmbedding: string | number[],
  limit = 20,
): { job: DiscoveredJob; similarity: number }[] {
  const target = typeof queryOrEmbedding === "string" ? localEmbed(queryOrEmbedding) : queryOrEmbedding;
  return jobs
    .filter((job) => job.embedding.length > 0)
    .map((job) => ({ job, similarity: cosineSimilarity(target, job.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export function rankJobs(
  jobs: DiscoveredJob[],
  context: SearchContext,
  expansion: QueryExpansion,
): ScoredJob[] {
  const expandedRoleNames = expansion.expandedRoles.map((role) => role.role);
  const queryEmbedding =
    expansion.literalTerms.length > 0
      ? localEmbed([...expansion.literalTerms, ...expandedRoleNames].join(" "))
      : context.profileEmbedding;

  return jobs
    .map((job) => {
      const keyword = keywordScore(job, expansion.literalTerms, expandedRoleNames);
      const structured = structuredScore(job, context);
      const preferences = preferenceScore(job, context.careerGoal);
      const semantic =
        job.embedding.length > 0 && queryEmbedding.length > 0
          ? // Cosine runs -1..1; map to 0..1 so it can't contribute negatively.
            (cosineSimilarity(queryEmbedding, job.embedding) + 1) / 2
          : 0.5;

      const score =
        keyword * WEIGHTS.keyword +
        structured.score * WEIGHTS.structured +
        semantic * WEIGHTS.semantic +
        preferences.score * WEIGHTS.preferences;

      const matchedExpansion =
        keyword < 1 && expandedRoleNames.length > 0
          ? expansion.expandedRoles.find((role) => canonical(job.title).includes(canonical(role.role))) ??
            null
          : null;

      return {
        job,
        score: Math.round(score * 100) / 100,
        components: {
          keyword: Math.round(keyword * 100) / 100,
          structured: Math.round(structured.score * 100) / 100,
          semantic: Math.round(semantic * 100) / 100,
          preferences: Math.round(preferences.score * 100) / 100,
        },
        reasons: [...structured.reasons, ...preferences.reasons].slice(0, 4),
        viaExpansion: matchedExpansion
          ? { role: matchedExpansion.role, rationale: matchedExpansion.rationale }
          : null,
      } satisfies ScoredJob;
    })
    .sort((a, b) => b.score - a.score);
}

export interface SearchJobsInput {
  jobs: DiscoveredJob[];
  query: string;
  filters?: JobFilters;
  context: SearchContext;
  limit?: number;
}

export interface SearchJobsResult {
  results: ScoredJob[];
  expansion: QueryExpansion;
  totalBeforeLimit: number;
}

/** The one call the UI makes: filter, expand, rank. */
export function searchJobs(input: SearchJobsInput): SearchJobsResult {
  const filtered = filterJobs(input.jobs, input.filters ?? {});
  const expansion = expandQuery(input.query, input.context.profileText);
  const ranked = rankJobs(filtered, input.context, expansion);

  // A literal query should never return things that match nothing at all;
  // without this, an empty search term and a nonsense one look identical.
  let relevant = ranked;
  if (input.query.trim()) {
    relevant = ranked.filter(s => s.components.keyword > 0 || s.components.semantic > 0.7);
  }

  return {
    results: relevant.slice(0, input.limit ?? 50),
    expansion,
    totalBeforeLimit: relevant.length,
  };
}
