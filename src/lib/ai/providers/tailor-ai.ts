import { aiProvider } from "@/lib/ai";
import {
  NO_FABRICATION_RULES,
  candidateBrief,
  completeStructured,
  jobBrief,
  str,
  strList,
  unsupportedNumbers,
} from "@/lib/ai/career-context";
import type { Application, Job } from "@/lib/db/types";
import type { FullCareerProfile } from "@/lib/career/get-full-profile";

export interface TailoredApplication {
  coverLetter: string;
  resumeBullets: string[];
  /** Numbers in the output that don't appear anywhere in the candidate's profile - shown as "check before sending". */
  unverifiedNumbers?: string[];
}

const TAILOR_SYSTEM = `You tailor ONE candidate's application to ONE job, for a human hiring manager first and keyword screening second.
1. coverLetter: 3 short paragraphs, under 250 words. Open with why this company/role specifically (from the JOB text), then the 2 most relevant real proofs from the candidate's history, then a confident close. Sign as [Your Name].
2. resumeBullets: 4-6 bullets. Each rewrites a REAL item from the CANDIDATE section for this job: strong verb, the tool/domain the job cares about, the real outcome.
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
      properties: { coverLetter: { type: "string" }, resumeBullets: { type: "array", items: { type: "string" } } },
      required: ["coverLetter", "resumeBullets"],
    },
    temperature: 0.4,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const coverLetter = str(r.coverLetter, 3000);
      const resumeBullets = strList(r.resumeBullets, 6, 400);
      return coverLetter && resumeBullets.length > 0 ? { coverLetter, resumeBullets } : null;
    },
  });
  if (!result) throw new Error("Failed to generate tailored application.");
  const unverifiedNumbers = unsupportedNumbers(`${result.coverLetter} ${result.resumeBullets.join(" ")}`, candidate);
  return { ...result, unverifiedNumbers };
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
