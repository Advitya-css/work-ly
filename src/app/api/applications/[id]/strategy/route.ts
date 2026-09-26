import { safeRewrite } from "@/lib/resume/tense";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import {
  NO_FABRICATION_RULES,
  candidateBrief,
  completeStructured,
  jobBrief,
  proApiGate,
  str,
  unsupportedNumbers,
  REWRITE_RULES,
} from "@/lib/ai/career-context";

export const maxDuration = 60;

const SYSTEM = `You are a senior recruiter preparing a candidate's application for ONE job.
Write "angle" and "risks" TO the candidate in the second person ("You have...", "Your..."), never "the candidate".
1. angle: one sentence - the single strongest, TRUE reason you fit this job, citing your real experience.
2. tweaks: 3 resume edits. "before" must be copied from a real line in the CANDIDATE section; "after" rewrites it for this job's language and priorities. The "after" MUST keep every number and metric in the "before" (counts, percentages, time saved) - a tweak that removes a real result makes the resume weaker, so skip it instead. Keep the tense of the "before" (a line starting "Built" stays past tense). The "after" may reword and reorder, but must not add an activity, tool, skill or outcome the "before" doesn't show (no "presented insights", "forecasting" or "stakeholder management" unless the line says so). Skip a tweak rather than invent a "before".
3. risks: up to 3 things a screener may flag (real gaps between JOB and CANDIDATE) and how to address each honestly in the application. Only name tools, platforms, skills and experience that literally appear in the CANDIDATE section - never suggest highlighting something the candidate hasn't shown.
4. coverLetter: under 200 words, human, specific to this company and job, using only real facts. Use [Your Name] for the signature.
${REWRITE_RULES}
${NO_FABRICATION_RULES}`;

const SCHEMA = {
  type: "object",
  properties: {
    angle: { type: "string" },
    tweaks: {
      type: "array",
      items: { type: "object", properties: { before: { type: "string" }, after: { type: "string" } }, required: ["before", "after"] },
    },
    risks: {
      type: "array",
      items: { type: "object", properties: { risk: { type: "string" }, howToAddress: { type: "string" } }, required: ["risk", "howToAddress"] },
    },
    coverLetter: { type: "string" },
  },
  required: ["angle", "tweaks", "risks", "coverLetter"],
};

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const gate = await proApiGate(user);
  if (gate) return gate;

  const { id } = await context.params;
  const [app, profile] = await Promise.all([getApplicationWithJobById(user!.id, id), getFullCareerProfile(user!.id)]);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  const candidate = candidateBrief(profile);

  const result = await completeStructured({
    system: SYSTEM,
    user: `JOB\n===\n${jobBrief(app.job, app.roleTitle, app.company)}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: SCHEMA,
    temperature: 0.4,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const angle = str(r.angle, 400);
      const coverLetter = str(r.coverLetter, 2000);
      const pairs = (v: unknown, a: string, b: string) =>
        Array.isArray(v)
          ? v
              .map((x) => ({ a: str((x as Record<string, unknown>)?.[a], 500), b: str((x as Record<string, unknown>)?.[b], 500) }))
              .filter((x): x is { a: string; b: string } => Boolean(x.a && x.b))
          : [];
      if (!angle || !coverLetter) return null;
      return { angle, coverLetter, tweaks: pairs(r.tweaks, "before", "after")
          // An "after" that loses the original's numbers is a downgrade, not a tweak.
          .filter((t) => unsupportedNumbers(t.a, t.b).length === 0)
          .map((t) => ({ ...t, b: safeRewrite(t.b, t.a) }))
          .slice(0, 3), risks: pairs(r.risks, "risk", "howToAddress").slice(0, 3) };
    },
  });
  if (!result) return NextResponse.json({ error: "Couldn't build a strategy right now. Please try again." }, { status: 502 });

  const flagged = unsupportedNumbers(`${result.coverLetter} ${result.tweaks.map((t) => t.b).join(" ")}`, candidate);
  const text = [
    "Your angle",
    result.angle,
    "",
    "1. Resume tweaks",
    ...result.tweaks.map((t) => `- Before: ${t.a}\n  After: ${t.b}`),
    "",
    "2. What a screener may flag",
    ...(result.risks.length ? result.risks.map((r) => `- ${r.a} - ${r.b}`) : ["- Nothing major stood out."]),
    "",
    "3. Cover letter draft",
    result.coverLetter,
    flagged.length ? `\nCheck these numbers before sending: ${flagged.join(", ")}. They don't appear in your profile.` : "",
  ].join("\n");

  return NextResponse.json({ text });
}
