import { fieldWords, titleIsRelevant } from "@/lib/discovery/relevance";

/**
 * CAREER CHANGERS. Someone moving from marketing into UX design used to get
 * a feed of marketing jobs: discovery searched their current title second,
 * and let any listing related to it through the relevance gate. When the
 * role they want shares no field with anything they've done, they're
 * changing careers, and their past titles should stop steering the search.
 */
export function isCareerChange(
  targetRole: string | null | undefined,
  pastTitles: (string | null | undefined)[],
): boolean {
  const target = targetRole?.trim();
  if (!target || fieldWords(target).length === 0) return false;
  const past = pastTitles.map((t) => t?.trim()).filter((t): t is string => Boolean(t));
  if (past.length === 0) return false;
  return !past.some((title) => titleIsRelevant(title, [target]));
}

/** "UX Designer" -> "Junior UX Designer": the level most career changers are hired at. */
export function entryVariant(role: string): string | null {
  const r = role.trim();
  if (!r || /\b(junior|jr|entry|associate|intern|graduate|trainee|apprentice)\b/i.test(r)) return null;
  return `Junior ${r}`;
}
