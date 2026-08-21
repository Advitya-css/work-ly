import { canonical } from "@/lib/text-utils";
import type { OpportunityWithJob, Skill } from "@/lib/db/types";

/**
 * RANKING INTERNSHIPS BY WHAT THEY WOULD ACTUALLY BUY YOU.
 *
 * The question a student is really asking is not "which internship would
 * take me", it is "which internship gets me closer to the job I want after
 * graduating". Those are different questions and they have different
 * answers: the internship that is easiest to get is frequently the one that
 * teaches you the least about where you said you were going.
 *
 * So the ranking here is not Fit. It is coverage: of the skills the dream
 * role asks for and the student does not yet have, how many would this
 * internship put them in front of? An internship that closes four real gaps
 * outranks one that closes none, even if the second is a better match on
 * paper.
 *
 * Everything below is deterministic string matching against skills that
 * were extracted from real posting text. Nothing is inferred about the
 * student, no model is called, and, as everywhere else in Workly, no
 * statement is made about the chance of being hired.
 */

export interface InternshipMatch {
  opportunity: OpportunityWithJob;
  /** Dream-role skills this internship asks for that the student lacks. */
  closesGaps: string[];
  /** Dream-role skills the student already has and would keep using. */
  reinforces: string[];
  /** True when the posting names the student's field of study. */
  matchesMajor: boolean;
  /** 0-100. Coverage of the gap list, not a probability of anything. */
  relevanceScore: number;
  /** Plain-language reason, built from the two lists above. */
  reasoning: string;
}

function normalizeSet(values: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const value of values) {
    const key = canonical(value);
    if (key) out.set(key, value);
  }
  return out;
}

/** Loose containment, so "React" matches "React.js" without matching everything. */
function has(haystack: Map<string, string>, needle: string): boolean {
  if (haystack.has(needle)) return true;
  for (const key of haystack.keys()) {
    if (key.length >= 3 && (key.includes(needle) || needle.includes(key))) return true;
  }
  return false;
}

export function matchInternships(params: {
  internships: OpportunityWithJob[];
  /** Required and preferred skills from the parsed dream role. */
  dreamSkills: string[];
  studentSkills: Skill[];
  major: string | null;
}): InternshipMatch[] {
  const { internships, dreamSkills, studentSkills, major } = params;

  const held = normalizeSet(studentSkills.map((s) => s.name));
  const dream = normalizeSet(dreamSkills);

  // The gap list: what the dream role wants that the student cannot yet
  // evidence. This is computed once, not per internship, because it is a
  // property of the student and the goal, not of any posting.
  const gapKeys: string[] = [];
  for (const [key] of dream) {
    if (!has(held, key)) gapKeys.push(key);
  }

  const majorKey = major ? canonical(major) : "";

  const matches = internships.map((opportunity) => {
    const posting = normalizeSet([
      ...opportunity.job.requiredSkills,
      ...opportunity.job.preferredSkills,
    ]);

    const closesGaps: string[] = [];
    const reinforces: string[] = [];

    for (const [key, label] of dream) {
      if (!has(posting, key)) continue;
      if (gapKeys.includes(key)) closesGaps.push(label);
      else reinforces.push(label);
    }

    const searchText = canonical(
      [opportunity.job.title, opportunity.job.industry, opportunity.job.description].filter(Boolean).join(" "),
    );
    const matchesMajor = Boolean(majorKey) && searchText.includes(majorKey);

    // Coverage of the gap list is the whole score, capped at 100. When the
    // student has no gaps at all, or the dream role produced no skills to
    // compare against, coverage is undefined rather than zero, so those
    // cases fall back to a neutral middle instead of ranking everything
    // last for a reason that has nothing to do with the internships.
    let relevanceScore: number;
    if (gapKeys.length === 0) {
      relevanceScore = dream.size === 0 ? 50 : 50 + Math.min(reinforces.length * 10, 40);
    } else {
      const coverage = closesGaps.length / gapKeys.length;
      relevanceScore = Math.round(coverage * 85 + (matchesMajor ? 15 : 0));
    }
    relevanceScore = Math.max(0, Math.min(100, relevanceScore));

    return {
      opportunity,
      closesGaps,
      reinforces,
      matchesMajor,
      relevanceScore,
      reasoning: buildReasoning({ closesGaps, reinforces, matchesMajor, major, gapCount: gapKeys.length }),
    };
  });

  return matches.sort(
    (a, b) => b.relevanceScore - a.relevanceScore || b.closesGaps.length - a.closesGaps.length,
  );
}

function buildReasoning(params: {
  closesGaps: string[];
  reinforces: string[];
  matchesMajor: boolean;
  major: string | null;
  gapCount: number;
}): string {
  const { closesGaps, reinforces, matchesMajor, major, gapCount } = params;
  const parts: string[] = [];

  if (closesGaps.length > 0) {
    const listed = closesGaps.slice(0, 3).join(", ");
    const rest = closesGaps.length > 3 ? ` and ${closesGaps.length - 3} more` : "";
    parts.push(
      `Would put you in front of ${listed}${rest}, which your dream role asks for and your profile does not show yet.`,
    );
  } else if (gapCount > 0) {
    parts.push("Does not touch any of the skills standing between you and your dream role.");
  }

  if (reinforces.length > 0) {
    parts.push(`Also uses ${reinforces.slice(0, 2).join(" and ")}, which you already have.`);
  }

  if (matchesMajor && major) {
    parts.push(`Named your field, ${major}.`);
  }

  if (parts.length === 0) {
    parts.push("No overlap found with your dream role's stated requirements.");
  }

  return parts.join(" ");
}

/** The gap list on its own, for showing the student what they are working toward. */
export function dreamGaps(dreamSkills: string[], studentSkills: Skill[]): string[] {
  const held = normalizeSet(studentSkills.map((s) => s.name));
  const out: string[] = [];
  for (const [key, label] of normalizeSet(dreamSkills)) {
    if (!has(held, key)) out.push(label);
  }
  return out;
}
