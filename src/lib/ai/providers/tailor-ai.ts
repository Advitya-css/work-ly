import { aiProvider } from "@/lib/ai";
import {
  NO_FABRICATION_RULES,
  candidateBrief,
  completeStructured,
  jobBrief,
  str,
  unsupportedNumbers,
} from "@/lib/ai/career-context";
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
}

const COVER_SYSTEM = `You write ONE cover letter from this candidate to this employer, for a busy human hiring manager.
- Plain text, 3 short paragraphs, 150-230 words in total. Open with "Dear Hiring Team," unless the JOB names the hiring manager.
- Paragraph 1: name what this team needs in the JOB's own terms (a product, problem or responsibility it actually mentions) and connect it to the candidate's real background in one or two sentences. Never open with "I am writing", "I am excited", "I was thrilled" or any line about applying.
- Paragraph 2: the TWO strongest real proofs from the CANDIDATE section for this job's main requirements. Name the employer each happened at and keep every real number exactly. Never merge facts from different roles into one story.
- Paragraph 3: one sentence on what they could take on first (from the JOB), then a plain request to talk.
- End with "Best regards," and the candidate's name exactly as given in NAME on its own line.
- Never use: passionate, results-driven, dynamic, fast-paced, synergy, leverage, thrilled, "perfect fit", "unique blend", "proven track record", "I believe".
- If the candidate lacks something the job requires, leave it out. Never claim it, never apologise for it.
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
  options: { name?: string | null } = {},
): Promise<TailoredApplication> {
  const candidate = candidateBrief(profile);
  const name = options.name?.trim() || "[Your Name]";
  const result = await completeStructured({
    quality: "high",
    system: COVER_SYSTEM,
    user: `NAME: ${name}\n\nJOB\n===\n${jobBrief(job, job.title ?? "this role", job.company)}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: {
      type: "object",
      properties: { coverLetter: { type: "string" } },
      required: ["coverLetter"],
    },
    temperature: 0.4,
    validate: (raw) => {
      const coverLetter = str((raw as Record<string, unknown>)?.coverLetter, 3000);
      // A "letter" of one line is a failed generation, not a draft.
      return coverLetter && coverLetter.split(/\s+/).length >= 40 ? tidyLetter(coverLetter) : null;
    },
  });
  if (!result) throw new Error("Failed to generate tailored application.");
  return { coverLetter: result, resumeBullets: [], unverifiedNumbers: unsupportedNumbers(result, candidate) };
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
