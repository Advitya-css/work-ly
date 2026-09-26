/**
 * WHICH MODEL A CALL RUNS ON - pure, so it can be tested.
 *
 * The stronger model is kept for the few Pro features a paying user judges
 * Work-ly on: the Fit check, the tailored resume, the cover letter, resume
 * bullets, the application strategy and mock-interview feedback. Everything
 * else (discovery, nightly checks, parsing, the free tools) stays on the
 * standard model.
 */

export type AIQuality = "standard" | "high";

/** Pro that is on and not expired gets the stronger model for the Fit check. */
export function fitQualityFor(user: { isPro: boolean; proUntil: Date | null } | null, now = new Date()): AIQuality {
  if (!user?.isPro) return "standard";
  if (user.proUntil && new Date(user.proUntil).getTime() <= now.getTime()) return "standard";
  return "high";
}
