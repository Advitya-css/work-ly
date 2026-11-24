import "server-only";

import type { FullCareerProfile } from "@/lib/career/get-full-profile";
import type { Job } from "@/lib/db/types";
import {
  NO_FABRICATION_RULES,
  candidateBrief,
  completeStructured,
  jobBrief,
  str,
  unsupportedNumbers,
  humanPunctuation,
} from "@/lib/ai/career-context";
import { HONESTY_RULE } from "@/lib/ai/honesty";
import { tidyLetter } from "@/lib/ai/providers/tailor-ai";

/**
 * THE NOTE TO THE HIRING MANAGER, without the request around it.
 *
 * The Pro action (pro-actions.ts) checks who is asking and spends their
 * hourly budget; the overnight ready-to-apply job (lib/morning) has no
 * one signed in and must not touch either. Both write the note here.
 */

export interface HiringManagerNote {
  email: string;
  subject: string | null;
  /** A LinkedIn connection request: LinkedIn caps these at 300 characters. */
  connectionNote: string | null;
  /** Who to look for, e.g. "Analytics Manager or Head of Analytics". */
  whoToFind: string | null;
  /** A short nudge to send if there's no reply in about a week. */
  followUp?: string | null;
  unverifiedNumbers: string[];
}

const OUTREACH_SYSTEM = `You write a short first message from a candidate to the person who would most likely manage this role.
Return:
- "message": an email, plain text, max 5 sentences after "Hi,". Sentence 1 names something specific from the JOB (a product, problem or responsibility it mentions), never flattery. Then ONE real proof from the CANDIDATE section that matches that need, with its employer and any real number kept exactly. Close by asking for a 15-minute conversation, then sign off with the candidate's name exactly as given in NAME. Never "I'm writing to express my interest", "I hope this finds you well", "passionate".
- "subject": an email subject under 9 words built on that proof and the role. Not "Application for ...".
- "connectionNote": the same idea as a LinkedIn connection request, under 280 characters including spaces, no greeting name, no sign-off.
- "whoToFind": the job title(s) of the person most likely to manage this role, judged from the JOB (team, level, function), e.g. "Analytics Manager or Head of Analytics". Max 2 titles joined with " or ".
- "followUp": a follow-up to send if there's no reply after a week: 2-3 sentences, adds ONE new real detail (a different proof) rather than repeating the first message, no guilt-tripping ("just checking in", "bumping this"). Sign off with the name from NAME.
${HONESTY_RULE}
${NO_FABRICATION_RULES}`;

export async function writeHiringManagerNote(
  profile: FullCareerProfile,
  job: Job,
  name: string | null | undefined,
): Promise<HiringManagerNote | null> {
  const candidate = candidateBrief(profile, 5000);
  const result = await completeStructured({
    // A paying user judges Work-ly on what it writes: the stronger model.
    quality: "high",
    system: OUTREACH_SYSTEM,
    user: `NAME: ${name?.trim() || "[Your Name]"}\n\nJOB\n===\n${jobBrief(job, job.title ?? "this role", job.company, 4000)}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        subject: { type: "string" },
        connectionNote: { type: "string" },
        whoToFind: { type: "string" },
        followUp: { type: "string" },
      },
      required: ["message", "subject", "connectionNote", "whoToFind", "followUp"],
    },
    temperature: 0.5,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const email = str(r?.message, 1500);
      if (!email) return null;
      const note = str(r?.connectionNote, 400);
      return {
        email: tidyLetter(email),
        subject: str(r?.subject, 120),
        // Over LinkedIn's limit it can't be sent as written, so it isn't offered.
        connectionNote: note && note.length <= 300 ? humanPunctuation(note) : null,
        whoToFind: str(r?.whoToFind, 120),
        followUp: (() => {
          const f = str(r?.followUp, 900);
          return f ? tidyLetter(f) : null;
        })(),
        unverifiedNumbers: [] as string[],
      } satisfies HiringManagerNote;
    },
  });
  if (!result) return null;
  // "a 15-minute conversation" is the ask, not a claim about the candidate.
  const claims = `${result.email} ${result.connectionNote ?? ""} ${result.subject ?? ""} ${result.followUp ?? ""}`.replace(/\b\d+[\s-]?min(ute)?s?\b/gi, "");
  result.unverifiedNumbers = unsupportedNumbers(claims, candidate);
  return result;
}
