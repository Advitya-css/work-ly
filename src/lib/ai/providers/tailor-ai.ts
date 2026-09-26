import { aiProvider } from "@/lib/ai";
import {
  NO_FABRICATION_RULES,
  REWRITE_RULES,
  candidateBrief,
  completeStructured,
  jobBrief,
  str,
  unsupportedNumbers,
} from "@/lib/ai/career-context";
import type { Application, Job } from "@/lib/db/types";
import { safeRewrite } from "@/lib/resume/tense";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export interface TailoredApplication {
  coverLetter: string;
  resumeBullets: string[];
  /** Each bullet with the profile line it came from, so the tool can show what changed. */
  bulletChanges?: { before: string; after: string }[];
  /** Numbers in the output that don't appear anywhere in the candidate's profile - shown as "check before sending". */
  unverifiedNumbers?: string[];
}

const TAILOR_SYSTEM = `You tailor ONE candidate's application to ONE job, for a human hiring manager first and keyword screening second.
1. coverLetter: 3 short paragraphs, under 250 words. Open with why this company/role specifically (from the JOB text), then the 2 most relevant real proofs from the candidate's history, then a confident close. Sign as [Your Name].
2. resumeBullets: 4-6 items. Each has "basedOn" (one real line copied exactly from the CANDIDATE section) and "rewrite" (that line tailored for this job: the tool/domain the job cares about, the real outcome).
${REWRITE_RULES}
${NO_FABRICATION_RULES}`;

/**
 * The full job description and the full grounded profile go in; honesty
 * rules and a post-check on numbers come out. The old version told the
 * model to "blend the candidate's experience with the exact keywords" the
 * job wanted, which in practice meant claiming skills the candidate lacked.
 */
export async function generateTailoredApplication(profile: FullCareerProfile, job: Job): Promise<TailoredApplication> {
  const candidate = candidateBrief(profile);
  const result = await completeStructured({
    system: TAILOR_SYSTEM,
    user: `JOB\n===\n${jobBrief(job, job.title ?? "this role", job.company)}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: {
      type: "object",
      properties: {
        coverLetter: { type: "string" },
        resumeBullets: {
          type: "array",
          items: {
            type: "object",
            properties: { basedOn: { type: "string" }, rewrite: { type: "string" } },
            required: ["basedOn", "rewrite"],
          },
        },
      },
      required: ["coverLetter", "resumeBullets"],
    },
    temperature: 0.4,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const coverLetter = str(r.coverLetter, 3000);
      const pairs = (Array.isArray(r.resumeBullets) ? r.resumeBullets : [])
        .map((b) => {
          if (typeof b === "string") return { before: "", after: str(b, 400) ?? "" };
          const o = b as Record<string, unknown>;
          return { before: str(o?.basedOn, 400) ?? "", after: str(o?.rewrite, 400) ?? "" };
        })
        .filter((p) => p.after)
        // A rewrite that drops the original's numbers loses the proof - keep the real line.
        .map((p) => (p.before && unsupportedNumbers(p.before, p.after).length > 0 ? { ...p, after: p.before } : p))
        .map((p) => (p.before ? { ...p, after: safeRewrite(p.after, p.before) } : p))
        .slice(0, 6);
      return coverLetter && pairs.length > 0 ? { coverLetter, bulletChanges: pairs } : null;
    },
  });
  if (!result) throw new Error("Failed to generate tailored application.");
  const resumeBullets = result.bulletChanges.map((p) => p.after);
  const unverifiedNumbers = unsupportedNumbers(`${result.coverLetter} ${resumeBullets.join(" ")}`, candidate);
  return { coverLetter: result.coverLetter, resumeBullets, bulletChanges: result.bulletChanges, unverifiedNumbers };
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
