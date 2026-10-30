/**
 * A quick read of a cover letter the way a hiring manager skims it: the
 * things that make one get binned in the first five seconds. Pure, so it
 * runs live in the editor as the user types.
 */

export interface LetterCheck {
  label: string;
  ok: boolean;
  /** What to do about it when it fails. */
  fix?: string;
}

const CLICHES = [
  "passionate",
  "results-driven",
  "results driven",
  "dynamic",
  "fast-paced",
  "synergy",
  "leverage",
  "thrilled",
  "perfect fit",
  "unique blend",
  "proven track record",
  "i believe",
  "team player",
  "hard-working",
  "go-getter",
  "think outside the box",
];

const WEAK_OPENERS = /^(i am writing|i'm writing|i am excited|i'm excited|i was thrilled|i am thrilled|i would like to apply|i am applying|please accept|my name is)/i;

/** The first sentence after the greeting. */
function opening(letter: string): string {
  const body = letter.replace(/^\s*(dear|hi|hello)[^\n]*\n+/i, "").trim();
  return body.split(/(?<=[.!?])\s/)[0] ?? "";
}

export function checkLetter(letter: string, opts: { maxWords: number; unverified: string[] }): LetterCheck[] {
  const text = letter.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const lower = text.toLowerCase();
  const cliches = CLICHES.filter((c) => new RegExp(`\\b${c.replace(/[-\s]/g, "[-\\s]")}\\b`, "i").test(lower));
  const first = opening(text);
  return [
    {
      label: "Opens with what they need, not with you",
      ok: Boolean(first) && !WEAK_OPENERS.test(first),
      fix: "Start with the problem or work the posting describes.",
    },
    {
      label: `Short enough to read in a minute (${words} words)`,
      ok: words > 0 && words <= opts.maxWords,
      fix: `Trim to under ${opts.maxWords} words.`,
    },
    {
      label: "No stock phrases",
      ok: cliches.length === 0,
      fix: cliches.length ? `Replace "${cliches.slice(0, 3).join('", "')}" with something specific.` : undefined,
    },
    {
      label: "Every number is on your profile",
      ok: opts.unverified.length === 0,
      fix: opts.unverified.length ? `Check ${opts.unverified.join(", ")}: keep only if true.` : undefined,
    },
  ];
}
