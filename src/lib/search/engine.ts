// Imported from text-utils rather than discovery/normalize or
// scoring/shared: both of those are server-only, and this engine runs in
// the browser on every keystroke. Same implementations, no server bundle.
import { canonical, skillsMatch } from "@/lib/text-utils";
import { cosineSimilarity, localEmbed } from "@/lib/search/embeddings";
import { expandQuery, type QueryExpansion } from "@/lib/search/role-graph";
import { detectValues, workValueByKey } from "@/lib/values/value-graph";
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
  profileLocation: string | null;
  /**
   * Work-culture preferences inferred from the candidate's CV (real AI, or
   * the lexical heuristic fallback - see resume-ai.ts / resume-heuristic.ts
   * and CandidateValueSignal). Empty for most candidates: it requires
   * actual supporting evidence in the resume, never a default guess.
   */
  profileValues: { value: string; confidence: number }[];
}

export interface ScoredJob {
  job: DiscoveredJob;
  score: number;
  components: {
    keyword: number;
    structured: number;
    semantic: number;
    preferences: number;
    values: number;
  };
  /** Human-readable, shown as "why it matches". */
  reasons: string[];
  /** Set when the job surfaced through role-graph expansion rather than a literal match. */
  viaExpansion: { role: string; rationale: string } | null;
}

// Five signals now, not four: VALUES (Values & Culture Matching) was added
// as its own weighted component rather than folded into `preferences`,
// because it answers a different question - preferences is what the
// candidate explicitly told Workly via CareerGoal (target role, countries,
// salary floor); values is what their CV's own history suggests they
// gravitate toward (see lib/values/value-graph.ts), which most candidates
// never state explicitly anywhere. Every mode's weights were rescaled
// proportionally to make room for it, so each mode's original signal
// balance (e.g. STRICT_SKILLS still leaning almost entirely on keyword +
// structured) is preserved, just slightly compressed.
const WEIGHTS = {
  BALANCED: { keyword: 0.31, structured: 0.22, semantic: 0.22, preferences: 0.13, values: 0.12 },
  STRICT_SKILLS: { keyword: 0.51, structured: 0.32, semantic: 0.0, preferences: 0.09, values: 0.08 },
  // Zeroing keyword here used to also zero out role-graph expansion - the
  // one signal in this file actually built to solve "I don't know what
  // this is called, but these are real job titles for it" (see
  // role-graph.ts). keywordScore() scores a job whose title matches an
  // *expanded* role name almost as highly as a literal match, so a fully
  // zero keyword weight discarded that entirely and left Explore mode
  // depending only on the local hashed-bag-of-words "semantic" signal -
  // which, per embeddings.ts's own doc comment, cannot tell that
  // "Sustainability Analyst" relates to "climate" unless the words
  // literally overlap. A real, non-zero keyword weight here means a query
  // the role graph actually covers surfaces its real job titles instead of
  // relying on lexical luck. `values` carries the highest weight of any
  // mode here on purpose: Explore is exactly the "I don't know what to
  // search for, but I care about X" mode, which is what values matching is
  // actually for.
  EXPLORE: { keyword: 0.26, structured: 0.12, semantic: 0.30, preferences: 0.17, values: 0.15 },
};

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

  if (job.workMode === "REMOTE") {
    // Deliberately NOT falling back to context.profileLocation here. That
    // used to happen ("if they typed 'San Francisco, US', we want 'US' -
    // but we can just use the whole string"), and it didn't work: a
    // free-text location like "Austin, TX" or "San Francisco, CA" doesn't
    // contain the string "US" as a substring, so almost every US
    // candidate who typed a city (rather than literally the word "US")
    // failed this match and every remote job got hit with a 50% penalty
    // and a "Remote, but restricted to US" reason that wasn't true. Only
    // careerGoal.countries is real, structured country data (a country
    // picker, not free text) - the same signal preferenceScore already
    // trusts for its own country check below. Guessing a country from a
    // location string is exactly the kind of unearned confidence this
    // codebase avoids everywhere else; this was the one place it hadn't
    // been fixed yet.
    const candidateCountries = context.careerGoal?.countries ?? [];

    if (job.country && candidateCountries.length > 0 && !candidateCountries.some(c => job.country!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(job.country!.toLowerCase()))) {
      parts.push(0.3);
      reasons.push(`Remote, but restricted to ${job.country}.`);
    } else {
      parts.push(1);
      reasons.push("Remote, making it broadly location-compatible.");
    }
  } else {
    parts.push(0.6);
  }

  
  let finalScore = parts.reduce((a, b) => a + b, 0) / parts.length;
  // Hard penalty if it's remote but explicitly locked to a country the candidate is not in
  if (reasons.some(r => r.startsWith("Remote, but restricted to "))) {
    finalScore *= 0.5; // Halve the structured score
  }
  return { score: finalScore, reasons };

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
  
  let finalScore = parts.reduce((a, b) => a + b, 0) / parts.length;
  // If we know candidate countries, and this job is explicitly in a different country, tank the score.
  if (job.country && goal.countries.length > 0 && !goal.countries.some(c => job.country!.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(job.country!.toLowerCase()))) {
     finalScore *= 0.5;
  }
  return { score: finalScore, reasons };

}

/**
 * Values & Culture Matching. Job-side detection is lexical (see
 * value-graph.ts's own doc comment for why that's a reasonable trade here,
 * even though it would be too weak for candidate-side inference): a job
 * posting that genuinely is climate-focused or mission-driven almost
 * always says so directly ("climate", "carbon", "mission-driven", ...),
 * unlike a candidate's history, which usually implies a value rather than
 * naming it.
 *
 * Three honest outcomes, not two: a real match earns a real boost: no
 * candidate values recorded, or a job that states no culture signal at
 * all, is neutral (0.5) - absence of a signal is not evidence of
 * mismatch; and a job that *does* state a culture but not the one the
 * candidate's CV supports gets a mild penalty, the same "we checked and it
 * doesn't line up" treatment industry/country mismatches get elsewhere in
 * this file.
 */
function valuesScore(
  job: DiscoveredJob,
  profileValues: SearchContext["profileValues"],
): { score: number; reasons: string[] } {
  if (profileValues.length === 0) return { score: 0.5, reasons: [] };

  const jobText = `${job.title} ${job.industry ?? ""} ${(job.description ?? "").slice(0, 2000)}`;
  const jobValueHits = detectValues(jobText);
  if (jobValueHits.length === 0) return { score: 0.5, reasons: [] };

  const jobValueKeys = new Set(jobValueHits.map((hit) => hit.value.key));
  const matched = [...profileValues]
    .filter((pv) => jobValueKeys.has(pv.value))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (matched) {
    const catalogEntry = workValueByKey(matched.value);
    const label = catalogEntry?.description ?? matched.value;
    return {
      score: 1,
      reasons: [`Aligns with your interest in ${catalogEntry?.label.toLowerCase() ?? matched.value} - this looks like a ${label} role.`],
    };
  }

  return { score: 0.4, reasons: [] };
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
  mode: SearchMode = "BALANCED",
  matchValues: boolean = false
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
          
      // Feature 2: Passive Vibe Match (always calculate against profile)
      const profileSemanticRaw = job.embedding.length > 0 && context.profileEmbedding.length > 0
        ? cosineSimilarity(context.profileEmbedding, job.embedding)
        : 0;

      const values = matchValues ? valuesScore(job, context.profileValues) : { score: 0, reasons: [] };

      let baseScore = 
        keyword * WEIGHTS[mode].keyword +
        structured.score * WEIGHTS[mode].structured +
        semantic * WEIGHTS[mode].semantic +
        preferences.score * WEIGHTS[mode].preferences;
      
      // Values Boost: If matchValues is on and there is alignment, explicitly add up to 15% bonus.
      if (matchValues && values.score > 0.5) {
        baseScore += 0.15;
      }
      
      const score = baseScore;

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
          values: Math.round(values.score * 100) / 100,
        },
        reasons: [
          // Values leads when present - it's the most specific "why", and
          // the one users explicitly asked to see spelled out rather than
          // buried behind a generic score.
          ...values.reasons,
          // Deliberately not phrased as "matches your work style" or
          // similar - profileSemanticRaw is cosine similarity over a
          // hashed bag-of-words vector (see embeddings.ts), which detects
          // shared terminology, not values, culture, or working style. A
          // confident-sounding claim the engine can't actually back up is
          // exactly the "feels fake" failure mode this line used to cause.
          ...(profileSemanticRaw > 0.45 ? ["Shares notable language with your profile - worth a look even without an exact title match"] : []),
          ...structured.reasons,
          ...preferences.reasons
        ].slice(0, 4),
        viaExpansion: matchedExpansion
          ? { role: matchedExpansion.role, rationale: matchedExpansion.rationale }
          : null,
      } satisfies ScoredJob;
    })
    .sort((a, b) => b.score - a.score);
}

export type SearchMode = "BALANCED" | "STRICT_SKILLS" | "EXPLORE";

export interface SearchJobsInput {
  mode?: SearchMode;
  matchValues?: boolean;
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
  const ranked = rankJobs(filtered, input.context, expansion, input.mode ?? "BALANCED");

  // A literal query should never return things that match nothing at all;
  // without this, an empty search term and a nonsense one look identical.
  let relevant = ranked;
  if (input.query.trim()) {
    // Top-tier semantic search: rely on the fully blended overall score.
    // This allows jobs with massive semantic vector overlap to pass even if they
    // lack exact keywords, while aggressively rejecting jobs that just happen
    // to match a single split word (like "Data" in a Nurse job) because their
    // overall score will fall below the baseline.
    relevant = ranked.filter(s => s.score > 0.58);
  }

  return {
    results: relevant.slice(0, input.limit ?? 50),
    expansion,
    totalBeforeLimit: relevant.length,
  };
}
