/**
 * Word-form-tolerant matching for the fallback scorer: "A/B testing" on a
 * profile should satisfy "designed and analysed A/B tests", and
 * "stakeholder management" should satisfy "managing stakeholders" no more
 * than it should match anything else. Kept deliberately narrow:
 *
 *   - both sides are cut to word stems (tests/testing/tested -> test),
 *   - the skill's stems must appear as one run, in order, in the text,
 *   - a one-word skill needs at least 4 letters ("Go" never matches
 *     "go-to-market"), so short names still rely on exact matching.
 */

function stem(word: string): string {
  let w = word.toLowerCase();
  for (const suffix of ["ings", "ing", "ies", "ied", "es", "ed", "s"]) {
    if (w.length > suffix.length + 2 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      if (suffix === "ies" || suffix === "ied") w += "y";
      break;
    }
  }
  return w;
}

function stems(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\/\-_.]/g, " ")
    .replace(/[^\p{L}\p{N}+#\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);
}

export function stemmedPhraseIn(skill: string, text: string): boolean {
  const need = stems(skill);
  if (need.length === 0) return false;
  if (need.length === 1 && need[0].length < 4) return false;
  const have = stems(text);
  for (let i = 0; i + need.length <= have.length; i++) {
    if (need.every((w, j) => have.at(i + j) === w)) return true;
  }
  return false;
}
