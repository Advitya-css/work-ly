/** Cover-letter choices, shared by the writer (server) and the editor (browser). */

export type LetterTone = "direct" | "warm" | "formal";
export type LetterLength = "short" | "standard";
export const LETTER_TONES: { key: LetterTone; label: string; hint: string }[] = [
  { key: "direct", label: "Direct", hint: "Plain and confident. Most hiring managers prefer it." },
  { key: "warm", label: "Warm", hint: "Friendlier, for startups and smaller teams." },
  { key: "formal", label: "Formal", hint: "For banks, government and traditional firms." },
];
