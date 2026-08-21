/**
 * Pure text helpers with no server-only dependencies.
 *
 * These live apart from lib/scoring/shared.ts and lib/discovery/normalize.ts
 * - both of which are server-only - because the search engine runs in the
 * browser. Client-side ranking needs exactly these functions and nothing
 * else from those modules, and importing them from there would drag the
 * scoring engine and the job parser into the client bundle.
 *
 * Both server-side modules re-export from here, so there is still only one
 * implementation. That matters: if the client canonicalised text even
 * slightly differently from the server, ranking in the browser would
 * disagree with dedup on the server, and the same job could appear twice.
 */

/** Lowercase, punctuation-free, single-spaced - the canonical comparison form. */
export function canonical(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Symbol-aware token normalization. Converts special tech tokens (e.g. C++, C#, .NET)
 * to canonical string representations before folding punctuation to spaces.
 */
export function normalizeToken(s: string): string {
  if (!s) return "";
  let val = s.trim().toLowerCase();
  // Preserve special programming language tokens before stripping punctuation
  val = val.replace(/\bc\+\+\b/g, "cplusplus");
  val = val.replace(/\bc#/g, "csharp");
  val = val.replace(/\.net\b/g, "dotnet");

  return val
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Standard Tech Skill Aliases map (canonical form -> set of equivalent normalized forms).
 */
const SKILL_ALIASES: Record<string, string[]> = {
  aws: ["amazon web services", "amazon web service", "aws cloud"],
  gcp: ["google cloud platform", "google cloud"],
  k8s: ["kubernetes"],
  golang: ["go"],
  postgres: ["postgresql", "postgres database"],
  typescript: ["ts"],
  javascript: ["js"],
  python: ["py"],
  "ci cd": ["ci/cd", "continuous integration", "continuous delivery", "continuous integration continuous delivery"],
  react: ["reactjs", "react js", "react.js"],
  node: ["nodejs", "node js", "node.js"],
  vue: ["vuejs", "vue js", "vue.js"],
  next: ["nextjs", "next js", "next.js"],
  express: ["expressjs", "express js", "express.js"],
  ml: ["machine learning"],
  ai: ["artificial intelligence"],
  nlp: ["natural language processing"],
  dl: ["deep learning"],
  cv: ["computer vision"],
  ui: ["user interface"],
  ux: ["user experience"],
  qa: ["quality assurance", "software testing"],
  mongodb: ["mongo"],
};

/** Build reverse lookup dictionary for O(1) alias checking */
const ALIAS_MAP: Map<string, string> = new Map();
for (const [canonicalName, aliases] of Object.entries(SKILL_ALIASES)) {
  const normalizedCanonical = normalizeToken(canonicalName);
  ALIAS_MAP.set(normalizedCanonical, normalizedCanonical);
  for (const alias of aliases) {
    const normalizedAlias = normalizeToken(alias);
    ALIAS_MAP.set(normalizedAlias, normalizedCanonical);
  }
}

function getCanonicalSkill(s: string): string {
  const norm = normalizeToken(s);
  return ALIAS_MAP.get(norm) ?? norm;
}

/** Distinct programming languages/techs that must never match as substring of another */
const DISTINCT_TECH_WORDS = new Set(["java", "script", "type", "post", "c", "r", "go"]);

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Single-character tech names that are real skills but must only match
 * exactly (or via alias). Without this, "C" would match inside every
 * word containing the letter c.
 */
const EXACT_MATCH_ONLY = new Set(["c", "r"]);

/**
 * Skill-name equality matching with alias resolution, word-boundary checks,
 * directional matching, and false-positive prevention.
 *
 * Directional logic: a CANDIDATE's skill can satisfy a REQUIREMENT if the
 * requirement text appears as a complete word-boundary match within the
 * candidate's skill name. But NOT the reverse — a requirement for
 * "React Native" is NOT satisfied by a candidate who only has "React".
 */
export function skillsMatch(candidateSkill: string, requirementSkill: string): boolean {
  const nc = normalizeToken(candidateSkill);
  const nr = normalizeToken(requirementSkill);
  if (!nc || !nr) return false;
  if (nc === nr) return true;

  // Check canonical aliases
  const cc = getCanonicalSkill(candidateSkill);
  const cr = getCanonicalSkill(requirementSkill);
  if (cc === cr) return true;

  // Prevent distinct tech words from substring matching each other (e.g. Java vs JavaScript)
  if (DISTINCT_TECH_WORDS.has(nc) || DISTINCT_TECH_WORDS.has(nr)) {
    return false;
  }

  // Single-char tech names only match exactly or via alias (handled above)
  if (EXACT_MATCH_ONLY.has(nc) || EXACT_MATCH_ONLY.has(nr)) {
    return false;
  }

  // Directional word-boundary matching: the requirement string must appear
  // as a whole word inside the candidate string.
  // This means candidate "React Native" matches requirement "React"
  // but candidate "React" DOES NOT match requirement "React Native".
  if (nr.length > 2) {
    const pattern = new RegExp(`\\b${escapeRegExp(nr)}\\b`, "i");
    return pattern.test(nc);
  }

  return false;
}

