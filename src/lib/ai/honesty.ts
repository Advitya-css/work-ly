/**
 * THE HONESTY LINE for AI advice. Work-ly promises it never invents
 * anything about you. Advice can break that promise just as easily as a
 * generated resume can: "state 5+ years of advanced analytics" or "say you
 * led the migration" tells someone to claim what their profile doesn't
 * show. Every coaching prompt includes HONESTY_RULE, and model output is
 * checked with stretchesClaims() before it's shown.
 */

export const HONESTY_RULE =
  "Never tell the candidate to state, claim, imply or round up anything their DOSSIER does not show: no years of experience they don't have, no tools, methods, titles, scope or results they haven't used or achieved. Repositioning means describing what they really did in the employer's language. Anything new has to be genuinely done first (a real project, course or task at work) before it goes on a resume. If they might have done something that just isn't written down, say \"if you have done X, add it\" - never assume it.";

const PATTERNS: RegExp[] = [
  // "State 5+ years of...", "highlight 3 years", "list 4 yrs"
  /\b(stat(e|es|ing)|claim(s|ing)?|say(s|ing)?|list(s|ing)?|writ(e|es|ing)|put(s|ting)?|mention(s|ing)?|highlight(s|ing)?|emphasi[sz](e|es|ing)|present(s|ing)?|fram(e|es|ing)|position(s|ing)?)\b[^.;:]{0,60}?\b\d+\s*\+?\s*(years?|yrs)\b/i,
  // "say you led...", "claim that you have..."
  /\b(say|state|claim)\s+(that\s+)?you\s+(have|had|are|were|led|built|own|owned|managed|ran|did|know)\b/i,
  // "exaggerate", "inflate", "round up your years", "pretend", "imply you"
  /\b(exaggerat\w*|inflat(e|ing)|round(ing)?\s+up|pretend\w*|fudg\w*|embellish\w*)\b/i,
  /\bimply\s+(that\s+)?you\b/i,
];

/** True when a piece of advice tells someone to claim more than they've shown. */
export function stretchesClaims(text: string | null | undefined): boolean {
  if (!text) return false;
  return PATTERNS.some((p) => p.test(text));
}
