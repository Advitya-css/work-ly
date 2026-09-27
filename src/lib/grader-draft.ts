/**
 * The free grader's resume and job, kept in the visitor's own browser so
 * that signing up picks up where they left off instead of asking them to
 * paste both again. Never sent anywhere until they choose to use it, and
 * dropped after a week or once used.
 */

const KEY = "workly:grader-draft";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface GraderDraft {
  resumeText: string;
  jobText: string;
  savedAt: number;
}

export function saveGraderDraft(draft: { resumeText: string; jobText: string }): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Private mode or storage blocked: the visitor simply pastes again later.
  }
}

export function readGraderDraft(now = Date.now()): GraderDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<GraderDraft>;
    if (typeof d.resumeText !== "string" || typeof d.jobText !== "string" || typeof d.savedAt !== "number") return null;
    if (now - d.savedAt > MAX_AGE_MS) {
      clearGraderDraft();
      return null;
    }
    return d as GraderDraft;
  } catch {
    return null;
  }
}

export function clearGraderDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

/** A short label for the saved job: its first meaningful line, trimmed. */
export function draftJobLabel(jobText: string): string {
  const line = jobText
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 3);
  if (!line) return "the job you checked";
  return line.length > 70 ? `${line.slice(0, 67).trimEnd()}...` : line;
}
