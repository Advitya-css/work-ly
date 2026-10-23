/** Same normalisation as scoring's normalizeForMatch, kept here so this file stays browser-safe. */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pure rules for the LinkedIn makeover, shared by the generator and tests.
 * LinkedIn's own limits: headline 220 characters, About 2,600.
 */

export const HEADLINE_MAX = 220;
export const ABOUT_MAX = 2600;

export interface LinkedInHeadline {
  text: string;
  /** What this option leads with, e.g. "Your role and best result". */
  angle: string;
}

export interface LinkedInMakeover {
  targetRole: string | null;
  headlines: LinkedInHeadline[];
  about: string;
  topSkills: string[];
  /** Numbers in the text that aren't on the profile - shown as "check these". */
  unverifiedNumbers: string[];
}

/**
 * A headline that opens with a title the person has never held reads as
 * claiming it ("Analytics Manager | dbt, SQL" from a Data Analyst). Moving
 * toward a role is fine ("Data Analyst moving into analytics management");
 * wearing it isn't.
 */
export function claimsUnheldTitle(headline: string, targetRole: string | null, heldTitles: string[]): boolean {
  if (!targetRole) return false;
  const target = normalizeForMatch(targetRole);
  if (!target) return false;
  const held = heldTitles.map((t) => normalizeForMatch(t));
  if (held.some((t) => t === target || t.includes(target))) return false;
  const opening = normalizeForMatch(headline.split(/[|·•,–—-]/)[0] ?? "");
  return opening === target || opening.startsWith(`${target} `) || opening.endsWith(` ${target}`);
}

export function cleanSkills(raw: unknown, known: string[], max = 5): string[] {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map(known.map((k) => [normalizeForMatch(k), k]));
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const hit = byKey.get(normalizeForMatch(item));
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= max) break;
  }
  return out;
}

/** Edits from the browser: only the text fields, capped at LinkedIn's limits. */
export function cleanMakeoverEdits(current: LinkedInMakeover, fields: Record<string, unknown>): LinkedInMakeover {
  const next = { ...current, headlines: current.headlines.map((h) => ({ ...h })) };
  if (typeof fields.about === "string") next.about = fields.about.replace(/\r\n/g, "\n").slice(0, ABOUT_MAX);
  if (Array.isArray(fields.headlines)) {
    fields.headlines.slice(0, next.headlines.length).forEach((h, i) => {
      if (typeof h === "string") next.headlines[i].text = h.replace(/\s+/g, " ").slice(0, HEADLINE_MAX);
    });
  }
  return next;
}
