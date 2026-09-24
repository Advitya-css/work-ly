/**
 * Is a discovered listing even in the right field?
 *
 * Public boards answer a search for "BI Analyst" with whatever they have:
 * copywriters, Shopify developers, service-desk engineers. Those used to be
 * stored, AI-screened (spending the screening budget on them) and shown as
 * 20 "Low Priority" cards burying the three real matches. This is a cheap,
 * deterministic gate on the TITLE: it must share a field word with what the
 * user is looking for. Level and function words ("Senior", "Engineer",
 * "Manager") don't count - "Senior DevOps Engineer" is not related to
 * "Analytics Engineer" just because both are engineers.
 */

const GENERIC = new Set([
  "senior", "sr", "junior", "jr", "lead", "staff", "principal", "head", "chief", "director", "vp",
  "manager", "engineer", "engineering", "developer", "specialist", "associate", "assistant", "intern",
  "internship", "trainee", "graduate", "entry", "level", "mid", "remote", "hybrid", "onsite", "contract",
  "freelance", "part", "time", "full", "i", "ii", "iii", "iv", "of", "and", "the", "for", "with", "in", "to",
  "a", "an", "at", "on", "team", "global", "officer", "executive", "consultant", "expert", "professional",
  "coordinator", "representative", "agent", "worker", "operator", "technician", "officer", "new", "no",
  "experience", "required", "us", "uk", "eu", "emea", "apac", "latam",
]);

/** A few field words whose short forms don't share a prefix with the long form. */
const SYNONYMS: Record<string, string[]> = {
  bi: ["intelligence", "analytics", "analyst", "reporting"],
  ml: ["machine", "learning"],
  ai: ["artificial", "machine", "learning"],
  ux: ["user", "experience", "design"],
  ui: ["interface", "design", "frontend"],
  hr: ["human", "people", "talent", "recruit"],
  qa: ["quality", "test"],
  pm: ["product", "project"],
  swe: ["software"],
  sde: ["software"],
};

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Field words of a title or search term, with abbreviations expanded. */
export function fieldWords(text: string): string[] {
  const out = new Set<string>();
  for (const w of words(text)) {
    if (GENERIC.has(w) || /^\d+$/.test(w)) continue;
    out.add(w);
    for (const s of SYNONYMS[w] ?? []) out.add(s);
  }
  return Array.from(out);
}

function stem(word: string): string {
  return word.length > 5 ? word.slice(0, 5) : word;
}

/**
 * True when the title shares at least one field word (by 5-letter stem, so
 * analyst / analytics / analysis match) with any of the targets. When the
 * targets have no field words at all (e.g. only "Senior Engineer"), nothing
 * can be judged and the listing passes.
 */
export function titleIsRelevant(title: string, targets: (string | null | undefined)[]): boolean {
  const targetStems = new Set(
    targets.filter((t): t is string => Boolean(t?.trim())).flatMap((t) => fieldWords(t).map(stem)),
  );
  if (targetStems.size === 0) return true;
  return fieldWords(title).some((w) => targetStems.has(stem(w)));
}
