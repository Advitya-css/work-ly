import { canonical } from "@/lib/text-utils";

// Same "curated over embedded" reasoning as role-graph.ts: a work-values
// classifier built on a real embedding model would happily return
// plausible-sounding but unauditable judgments about what someone "seems to
// value" from parsing their resume - exactly the kind of confident-but-
// unverifiable inference this codebase avoids everywhere else. A short,
// hand-written catalog is smaller, inspectable, correctable, and every
// value's keyword list can be read and argued with directly.
//
// This same catalog backs two different jobs, deliberately:
//   1. The heuristic (non-AI) fallback for CANDIDATE-side inference, when
//      no AI provider is configured - see resume-heuristic.ts.
//   2. JOB-side value detection in the search engine (engine.ts), which
//      runs synchronously in the browser on every render and therefore
//      cannot call an AI model at all. Job postings usually state their
//      culture directly ("mission-driven", "climate-focused", "fast-paced
//      startup"), so lexical matching is a reasonably strong signal there
//      even though it would be a weak one for candidate-side inference
//      (which is why the real AI resume parser - resume-ai.ts - does that
//      side properly, with the CV's actual described work as evidence,
//      not just keyword hits).
export interface WorkValue {
  key: string;
  label: string;
  /** Shown in match reasoning: "This is a <description> role." */
  description: string;
  /** Lexical signals - lowercase, matched as whole word sequences against canonicalized text. */
  keywords: string[];
}

export const WORK_VALUES: WorkValue[] = [
  {
    key: "sustainability_climate",
    label: "Sustainability & Climate",
    description: "sustainability- or climate-focused",
    keywords: [
      "sustainability", "sustainable", "climate", "carbon", "emissions", "renewable",
      "esg", "clean energy", "cleantech", "green energy", "environmental impact",
      "net zero", "decarbonization", "circular economy",
    ],
  },
  {
    key: "social_impact",
    label: "Social Impact & Mission-Driven",
    description: "mission-driven / social-impact",
    keywords: [
      "social impact", "nonprofit", "non-profit", "ngo", "mission-driven", "mission driven",
      "philanthropy", "humanitarian", "community impact", "underserved", "equity and inclusion",
      "public good", "charitable", "volunteer",
    ],
  },
  {
    key: "startup_pace",
    label: "Startup / Fast-Paced",
    description: "fast-paced, early-stage",
    keywords: [
      "startup", "start-up", "fast-paced", "fast paced", "early-stage", "early stage",
      "seed stage", "series a", "series b", "scrappy", "wear many hats", "0 to 1", "zero to one",
      "high-growth", "high growth", "move fast",
    ],
  },
  {
    key: "stability_structured",
    label: "Stability & Structure",
    description: "structured, process-driven",
    keywords: [
      "established", "enterprise", "fortune 500", "well-resourced", "structured environment",
      "process-driven", "process driven", "governance", "compliance-focused", "long-term stability",
      "career development program",
    ],
  },
  {
    key: "public_service",
    label: "Public Service & Government",
    description: "public-sector / government",
    keywords: [
      "government", "public sector", "public policy", "civil service", "federal agency",
      "state agency", "municipal", "public administration", "policy reform",
    ],
  },
  {
    key: "research_academic",
    label: "Research & Academia",
    description: "research- or academia-oriented",
    keywords: [
      "research", "academia", "academic", "peer-reviewed", "peer reviewed", "publication",
      "laboratory", "phd", "doctoral", "grant-funded", "grant funded", "scholarly",
    ],
  },
  {
    key: "creative_autonomy",
    label: "Creative Autonomy",
    description: "creative, autonomy-driven",
    keywords: [
      "creative direction", "creative freedom", "autonomous", "independent work",
      "self-directed", "artistic", "design-led", "design led", "portfolio-driven",
    ],
  },
  {
    key: "work_life_balance",
    label: "Work-Life Balance",
    description: "balance-oriented",
    keywords: [
      "work-life balance", "work life balance", "flexible hours", "flexible schedule",
      "four-day week", "four day week", "no overtime", "wellbeing-focused", "well-being focused",
      "family-friendly", "family friendly",
    ],
  },
];

/**
 * True if `needle` appears as a contiguous run of whole words inside
 * `haystack`. Plain substring matching would let short keywords like "esg"
 * or "ngo" fire inside unrelated words (the same class of bug fixed in
 * role-graph.ts's containsWordSequence) - this instead compares canonical
 * word sequences.
 */
function containsWordSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset++) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

/**
 * Whole-word-sequence keyword hits in `text` for a given value, deduped.
 * Deliberately simple - it's a lexical signal, not a claim about meaning,
 * and every caller is responsible for treating it as evidence rather than
 * certainty (see resume-heuristic.ts and search/engine.ts).
 */
export function matchedKeywords(value: WorkValue, text: string): string[] {
  const haystackWords = canonical(text).split(" ").filter(Boolean);
  return value.keywords.filter((keyword) => containsWordSequence(haystackWords, canonical(keyword).split(" ").filter(Boolean)));
}

/** All values with at least one lexical hit in `text`, most-hits-first. */
export function detectValues(text: string): { value: WorkValue; hits: string[] }[] {
  if (!text) return [];
  return WORK_VALUES.map((value) => ({ value, hits: matchedKeywords(value, text) }))
    .filter((entry) => entry.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length);
}

export function workValueByKey(key: string): WorkValue | undefined {
  return WORK_VALUES.find((v) => v.key === key);
}
