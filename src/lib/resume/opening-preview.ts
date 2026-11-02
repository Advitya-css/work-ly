import "server-only";

import { createHash, createHmac, timingSafeEqual } from "crypto";

import { NO_FABRICATION_RULES, REWRITE_RULES, completeStructured, str, unsupportedNumbers } from "@/lib/ai/career-context";
import { safeRewrite } from "@/lib/resume/tense";
import { quoteFound } from "@/lib/scoring/screen-core";

/**
 * THE FIRST LINES, FREE.
 *
 * Right after the homepage check says "Apply" (or "A stretch"), Work-ly
 * writes the top of the visitor's resume for that job: a summary and their
 * two most relevant lines, rewritten. The rest is shown blurred. It's the
 * moment they most want the application, so it's the moment to show it.
 *
 * Same honesty rules as the full resume: every rewritten line names the
 * resume line it came from (it must really be there), and any number the
 * original didn't have sends the original back instead.
 *
 * It's only offered straight after a check that said yes: the check hands
 * out a short-lived signed ticket for exactly that resume and job, and the
 * ticket works once. So this can't be used as a free writing service.
 */

export interface OpeningPreview {
  summary: string | null;
  bullets: { text: string; from: string }[];
}

const POSITIVE = new Set(["APPLY_NOW", "APPLY", "STRETCH"]);
const TICKET_TTL_MS = 30 * 60 * 1000;

function key(): string | null {
  const s = process.env.AUTH_SECRET?.trim() || process.env.EMAIL_LINK_SECRET?.trim();
  if (s) return `opening-preview:${s}`;
  return process.env.NODE_ENV === "production" ? null : "opening-preview:local-development";
}

const digest = (text: string) => createHash("sha256").update(text.trim()).digest("base64url").slice(0, 22);

/** A ticket for one preview of this resume against this job, or null when the verdict wasn't a yes. */
export function previewTicket(resumeText: string, jobText: string, recommendation: string | null, now = Date.now()): string | null {
  const k = key();
  if (!k || !recommendation || !POSITIVE.has(recommendation)) return null;
  const body = `${digest(resumeText)}.${digest(jobText)}.${now + TICKET_TTL_MS}`;
  return `${body}.${createHmac("sha256", k).update(body).digest("base64url").slice(0, 22)}`;
}

/** The ticket's id (for "used once") when it's valid for these texts, else null. */
export function checkTicket(ticket: string, resumeText: string, jobText: string, now = Date.now()): string | null {
  const k = key();
  const parts = (ticket ?? "").split(".");
  if (!k || parts.length !== 4) return null;
  const [r, j, exp, sig] = parts;
  const body = `${r}.${j}.${exp}`;
  const expected = Buffer.from(createHmac("sha256", k).update(body).digest("base64url").slice(0, 22));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < now) return null;
  if (r !== digest(resumeText) || j !== digest(jobText)) return null;
  return sig;
}

const SYSTEM = `You write the TOP of a candidate's resume for ONE job, from the CANDIDATE section (their pasted resume) only. You never add facts.
"summary": 2 sentences a recruiter for THIS job keeps reading. Sentence 1: the candidate's real title or field and the kind of work this JOB centres on, then their single strongest relevant proof with its real number or scale. Sentence 2: the 2 tools or methods from the CANDIDATE section this JOB most needs. Never open with "<Title> with X years", "Results-driven", "Experienced", "Passionate" or "Highly motivated"; no first person; no clichés; never make a fact bigger.
"bullets": the candidate's 2 lines most relevant to this JOB, each with "basedOn" (copied exactly from the CANDIDATE section, one line or sentence) and "text" (the rewrite: same tense as basedOn, leads with what this JOB cares about, keeps every number exactly).
${REWRITE_RULES}
${NO_FABRICATION_RULES}`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    bullets: {
      type: "array",
      items: {
        type: "object",
        properties: { basedOn: { type: "string" }, text: { type: "string" } },
        required: ["basedOn", "text"],
      },
    },
  },
  required: ["summary", "bullets"],
};

export async function writeOpeningPreview(resumeText: string, jobText: string): Promise<OpeningPreview | null> {
  const resume = resumeText.slice(0, 8000);
  return completeStructured({
    quality: "high",
    system: SYSTEM,
    user: `JOB\n===\n${jobText.slice(0, 5000)}\n\nCANDIDATE\n=========\n${resume}`,
    schema: SCHEMA,
    temperature: 0.3,
    validate: (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const r = raw as Record<string, unknown>;
      let summary = str(r.summary, 600);
      // A summary with a number the resume doesn't have is dropped, not shown.
      if (summary && unsupportedNumbers(summary, resume).length > 0) summary = null;
      const bullets: OpeningPreview["bullets"] = [];
      const seen = new Set<string>();
      for (const b of Array.isArray(r.bullets) ? r.bullets : []) {
        const basedOn = str((b as Record<string, unknown>)?.basedOn, 400)?.replace(/^[\s•\-*●▪◦]+/, "");
        const text = str((b as Record<string, unknown>)?.text, 300);
        if (!basedOn || !text || !quoteFound(basedOn, resume) || seen.has(basedOn)) continue;
        seen.add(basedOn);
        const invented = unsupportedNumbers(text, basedOn).length > 0;
        const lost = unsupportedNumbers(basedOn, text).length > 0;
        bullets.push({ text: invented || lost ? basedOn : safeRewrite(text, basedOn), from: basedOn });
        if (bullets.length === 2) break;
      }
      if (!summary && bullets.length === 0) return null;
      return { summary: summary ?? null, bullets };
    },
  });
}
