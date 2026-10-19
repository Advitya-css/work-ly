/**
 * The line under the free checker's score, counted from the requirement
 * verdicts rather than taken from the model's prose.
 */
export function graderHeadline(met: number, total: number, mustHavesMissing: number): string {
  if (total === 0) return "";
  const all = met === total;
  const shows = all ? `Your resume shows all ${total} of this job's requirements` : `Your resume shows ${met} of this job's ${total} requirements`;
  if (all) return `${shows}.`;
  if (mustHavesMissing === 0) return `${shows}, including every must-have.`;
  return `${shows}. ${mustHavesMissing === 1 ? "1 must-have is" : `${mustHavesMissing} must-haves are`} missing.`;
}

/**
 * True when a model summary makes its own count claim ("meets nearly
 * every requirement", "most of the must-haves"), which can disagree with the
 * counted headline. Those summaries are dropped; the headline says it.
 */
export function countsInWords(summary: string | null | undefined): boolean {
  if (!summary) return false;
  return /\b(all|every|most|nearly|almost|majority|few|several|none|half|many)\b[^.]{0,40}\b(requirements?|criteria|must-haves?|skills|qualifications|boxes)\b/i.test(summary);
}
