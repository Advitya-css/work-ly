import { aiProvider } from "@/lib/ai";
import {
  NO_FABRICATION_RULES,
  candidateBrief,
  completeStructured,
  jobBrief,
  str,
  unsupportedNumbers,
} from "@/lib/ai/career-context";
import { quoteFound } from "@/lib/scoring/screen-core";
import type { LetterLength, LetterTone } from "@/lib/ai/letter-options";

export type { LetterLength, LetterTone } from "@/lib/ai/letter-options";
import type { Application, Job } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export interface TailoredApplication {
  coverLetter: string;
  /**
   * Kept for older saved results. The cover-letter tool used to return
   * bullet rewrites too; the tailored resume does that job properly now.
   */
  resumeBullets: string[];
  bulletChanges?: { before: string; after: string }[];
  /** Numbers in the letter that don't appear anywhere in the candidate's profile - shown as "check before sending". */
  unverifiedNumbers?: string[];
  /** The candidate's own lines the letter is built on, each found on the profile. */
  proofs?: string[];
  /** What the hiring-manager read of the first draft fixed. */
  revisions?: string[];
  /** What it was written as, so a rewrite keeps the user's choice. */
  tone?: LetterTone;
  length?: LetterLength;
}

const TONE_RULE: Record<LetterTone, string> = {
  direct: "TONE: direct and confident. Short sentences, active verbs, no hedging, no pleasantries.",
  warm: "TONE: warm and human, as if writing to someone you'd like to work with. Still specific; never gushing.",
  formal: "TONE: formal and courteous, complete sentences, no contractions, suited to a traditional employer.",
};
const LENGTH_RULE: Record<LetterLength, string> = {
  short: "LENGTH: 3 short paragraphs, 110-150 words in total.",
  standard: "LENGTH: 3 short paragraphs, 170-240 words in total.",
};

const COVER_SYSTEM = `You write ONE cover letter from this candidate to this employer, for a busy human hiring manager.
- Plain text. Open with "Dear Hiring Team," unless the JOB names the hiring manager. Follow the TONE and LENGTH given in the user message.
- Paragraph 1: name what this team needs in the JOB's own terms (a product, problem or responsibility it actually mentions) and connect it to the candidate's real background in one or two sentences. Never open with "I am writing", "I am excited", "I was thrilled" or any line about applying.
- Paragraph 2: the TWO strongest real proofs from the CANDIDATE section for this job's main requirements. Name the employer each happened at and keep every real number exactly. Never merge facts from different roles into one story.
- Paragraph 3: one sentence on what they could take on first (from the JOB), then a plain request to talk.
- End with "Best regards," and the candidate's name exactly as given in NAME on its own line.
- Never use: passionate, results-driven, dynamic, fast-paced, synergy, leverage, thrilled, "perfect fit", "unique blend", "proven track record", "I believe".
- If the candidate lacks something the job requires, leave it out. Never claim it, never apologise for it.
- Write like a strong candidate who knows this work, not like a template: every sentence should be one only THIS candidate could send to THIS team.
Also return "proofs": the 1-3 lines from the CANDIDATE section the letter is built on, each copied exactly.
${NO_FABRICATION_RULES}`;

/**
 * The full job description and the full grounded profile go in; honesty
 * rules and a post-check on numbers come out. The old version told the
 * model to "blend the candidate's experience with the exact keywords" the
 * job wanted, which in practice meant claiming skills the candidate lacked.
 */
export async function generateTailoredApplication(
  profile: FullCareerProfile,
  job: Job,
  options: { name?: string | null; tone?: LetterTone; length?: LetterLength } = {},
): Promise<TailoredApplication> {
  const candidate = candidateBrief(profile);
  const name = options.name?.trim() || "[Your Name]";
  const tone: LetterTone = options.tone && options.tone in TONE_RULE ? options.tone : "direct";
  const length: LetterLength = options.length === "short" ? "short" : "standard";
  const result = await completeStructured({
    quality: "high",
    system: COVER_SYSTEM,
    user: `NAME: ${name}\n${TONE_RULE[tone]}\n${LENGTH_RULE[length]}\n\nJOB\n===\n${jobBrief(job, job.title ?? "this role", job.company)}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: {
      type: "object",
      properties: { coverLetter: { type: "string" }, proofs: { type: "array", items: { type: "string" } } },
      required: ["coverLetter", "proofs"],
    },
    temperature: 0.4,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const coverLetter = str(r?.coverLetter, 3000);
      // A "letter" of one line is a failed generation, not a draft.
      if (!coverLetter || coverLetter.split(/\s+/).length < 40) return null;
      // Only lines really on the profile are shown as "built on".
      const proofs = Array.isArray(r?.proofs)
        ? r.proofs
            .map((p) => str(p, 400))
            .filter((p): p is string => Boolean(p) && quoteFound(p as string, candidate))
            .map((p) => p.replace(/^[\s•\-*]+/, ""))
            .slice(0, 3)
        : [];
      return { letter: tidyLetter(coverLetter), proofs };
    },
  });
  if (!result) throw new Error("Failed to generate tailored application.");
  // The second read. If it fails or isn't safe, the first draft stands.
  const revised = await reviseLetter(result.letter, {
    candidate,
    jobText: jobBrief(job, job.title ?? "this role", job.company, 4000),
    tone: TONE_RULE[tone],
    length: LENGTH_RULE[length],
    maxWords: length === "short" ? 175 : 270,
  }).catch(() => null);
  const letter = revised?.letter ?? result.letter;
  return {
    coverLetter: letter,
    resumeBullets: [],
    unverifiedNumbers: unsupportedNumbers(letter, candidate),
    proofs: result.proofs,
    revisions: revised?.critique ?? [],
    tone,
    length,
  };
}

const REVISE_SYSTEM = `You are the hiring manager for the JOB, reading this candidate's cover letter DRAFT before it is sent. Be the toughest fair reader.
Return:
- "critique": the 1-3 most damaging weaknesses, each one short sentence naming the exact problem (a sentence any candidate could send, a claim without proof, a vague verb, a slow opening, filler). If the draft is already strong, return [].
- "coverLetter": the letter rewritten to fix exactly those weaknesses. Keep its structure, greeting, sign-off, TONE and LENGTH. Every fact, number, employer and title must come from the DRAFT or the CANDIDATE section, exactly as written there. Never add a skill, number, result or claim. Shorter and sharper beats longer.
Never use: passionate, results-driven, dynamic, fast-paced, synergy, leverage, thrilled, "perfect fit", "unique blend", "proven track record", "I believe".
${NO_FABRICATION_RULES}`;

/**
 * A second read: the hiring manager's critique of the draft, then the
 * draft fixed. Kept only when it's at least as honest as the draft (no new
 * unverified numbers) and still the asked-for length; otherwise the draft
 * stands.
 */
async function reviseLetter(
  draft: string,
  ctx: { candidate: string; jobText: string; tone: string; length: string; maxWords: number },
): Promise<{ letter: string; critique: string[] } | null> {
  const result = await completeStructured({
    quality: "high",
    system: REVISE_SYSTEM,
    user: `${ctx.tone}\n${ctx.length}\n\nJOB\n===\n${ctx.jobText}\n\nCANDIDATE\n=========\n${ctx.candidate}\n\nDRAFT\n=====\n${draft}`,
    schema: {
      type: "object",
      properties: { critique: { type: "array", items: { type: "string" } }, coverLetter: { type: "string" } },
      required: ["critique", "coverLetter"],
    },
    temperature: 0.3,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const letter = str(r?.coverLetter, 3000);
      if (!letter) return null;
      const words = letter.split(/\s+/).length;
      if (words < 40 || words > ctx.maxWords) return null;
      const critique = Array.isArray(r?.critique)
        ? r.critique.map((c) => str(c, 240)).filter((c): c is string => Boolean(c)).slice(0, 3)
        : [];
      return { letter: tidyLetter(letter), critique };
    },
  });
  if (!result) return null;
  // Never trade honesty for polish: a revision with more unverified numbers than the draft is dropped.
  if (unsupportedNumbers(result.letter, `${ctx.candidate}\n${draft}`).length > 0) return null;
  if (unsupportedNumbers(result.letter, ctx.candidate).length > unsupportedNumbers(draft, ctx.candidate).length) return null;
  return result;
}

/** Normalises spacing: one blank line between paragraphs, no trailing spaces. */
export function tidyLetter(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateFollowUpEmail(application: Application, job: Job): Promise<string> {
  const statusContext =
    application.status === "INTERVIEW"
      ? "after my recent interview"
      : application.status === "ASSESSMENT"
        ? "after submitting my assessment"
        : "after submitting my initial application";

  const prompt = `You are a career coach writing a brief, professional follow-up email.
The candidate is following up ${statusContext} for the "${job.title}" position at ${job.company}.
It has been roughly a week with no response.

Write a short, polite email (max 4 sentences) checking in on the status of their candidacy and restating one genuine reason for their interest.
Use the real role and company names given here. Sign off as [Your Name] - do not invent a name.
Return the email text only. No markdown fences.`;

  const res = await aiProvider.complete({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return res.content.trim();
}
