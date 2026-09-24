/**
 * The label recorded as an application's "CV version" when the user built
 * a Work-ly tailored resume for that job. A fixed label (rather than free
 * text) is what lets outcomes be compared: tailored vs not, over time.
 */
export const TAILORED_CV_LABEL = "Work-ly tailored resume";

export function isTailoredCv(cvVersion: string | null | undefined): boolean {
  return (cvVersion ?? "").trim().toLowerCase().startsWith("work-ly tailored");
}
