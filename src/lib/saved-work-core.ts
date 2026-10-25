/**
 * What someone has built with Work-ly so far, in words: "2 tailored resumes
 * and a cover letter". Used by the trial banner, the trial-ended email and
 * the saved-work panel, so all three say the same thing. Pure, so tested.
 */

export interface SavedWorkCounts {
  resume: number;
  cover: number;
  note: number;
  interview: number;
  linkedin: number;
}

export const EMPTY_COUNTS: SavedWorkCounts = { resume: 0, cover: 0, note: 0, interview: 0, linkedin: 0 };

export function totalSaved(c: SavedWorkCounts): number {
  return c.resume + c.cover + c.note + c.interview + c.linkedin;
}

const WORDS: { key: keyof SavedWorkCounts; one: string; many: string }[] = [
  { key: "resume", one: "a tailored resume", many: "tailored resumes" },
  { key: "cover", one: "a cover letter", many: "cover letters" },
  { key: "note", one: "a note to a hiring manager", many: "notes to hiring managers" },
  { key: "interview", one: "a set of interview questions", many: "sets of interview questions" },
  { key: "linkedin", one: "your LinkedIn makeover", many: "your LinkedIn makeover" },
];

/** "2 tailored resumes, a cover letter and your LinkedIn makeover", or "" when nothing is saved. */
export function describeSavedWork(c: SavedWorkCounts): string {
  const parts = WORDS.filter((w) => c[w.key] > 0).map((w) =>
    c[w.key] === 1 || w.key === "linkedin" ? w.one : `${c[w.key]} ${w.many}`,
  );
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** "is" or "are" for the phrase above ("2 tailored resumes are saved", "a cover letter is saved"). */
export function savedVerb(c: SavedWorkCounts): "is" | "are" {
  const kinds = WORDS.filter((w) => c[w.key] > 0);
  return kinds.length === 1 && (c[kinds[0].key] === 1 || kinds[0].key === "linkedin") ? "is" : "are";
}

/** Capitalised for the start of a sentence. */
export function capitalise(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

const KIND_LABEL: Record<keyof SavedWorkCounts, string> = {
  resume: "Tailored resume",
  cover: "Cover letter",
  note: "Note to the hiring manager",
  interview: "Interview questions",
  linkedin: "LinkedIn makeover",
};

export function kindLabel(kind: keyof SavedWorkCounts): string {
  return KIND_LABEL[kind];
}

/** The first few words of a saved text, cut at a word, for a locked preview. */
export function previewOf(text: string | null | undefined, max = 180): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "")}…`;
}
