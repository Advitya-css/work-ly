import { matchSourceTense } from "@/lib/resume/tense";
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
  strList,
  unsupportedNumbers,
} from "@/lib/ai/career-context";

export const maxDuration = 60;

const SYSTEM = `You are a senior recruiter rewriting a candidate's resume content for ONE specific job. You optimise for a human hiring manager first and keyword screening second.
1. keywords: 5-8 exact phrases from the JOB that the candidate can honestly claim (they appear in or are clearly supported by the CANDIDATE section). Put phrases the candidate CANNOT honestly claim in "missingKeywords" instead.
2. summary: 2-3 sentences bridging the candidate's real background to this job. First person implied, no "I".
3. bullets: 3-5 rewritten bullets. Each must be based on one real line of the candidate's experience: give that line in "basedOn" (copied from the CANDIDATE section) and the rewrite in "rewrite". Keep the tense of "basedOn" (if it starts with a past-tense verb like "Built", the rewrite starts with a past-tense verb too), name the tool/domain the job cares about, and keep EVERY number that is in "basedOn" - add none, drop none.
${NO_FABRICATION_RULES}`;

const SCHEMA = {
  type: "object",
  properties: {
    keywords: { type: "array", items: { type: "string" } },
    missingKeywords: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    bullets: {
      type: "array",
      items: {
        type: "object",
        properties: { basedOn: { type: "string" }, rewrite: { type: "string" } },
        required: ["basedOn", "rewrite"],
      },
    },
  },
  required: ["keywords", "missingKeywords", "summary", "bullets"],
};

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const gate = await proApiGate(user);
  if (gate) return gate;

  const { id } = await context.params;
  const [app, profile] = await Promise.all([getApplicationWithJobById(user!.id, id), getFullCareerProfile(user!.id)]);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (!app.job) {
    return NextResponse.json({ error: "This application has no saved job description to tailor against." }, { status: 400 });
  }
  const candidate = candidateBrief(profile);

  const result = await completeStructured({
    system: SYSTEM,
    user: `JOB\n===\n${jobBrief(app.job, app.roleTitle, app.company)}\n\nCANDIDATE\n=========\n${candidate}`,
    schema: SCHEMA,
    temperature: 0.3,
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      const summary = str(r.summary, 800);
      const bullets = Array.isArray(r.bullets)
        ? r.bullets
            .map((b) => ({ basedOn: str((b as Record<string, unknown>)?.basedOn, 400), rewrite: str((b as Record<string, unknown>)?.rewrite, 400) }))
            .filter((b): b is { basedOn: string; rewrite: string } => Boolean(b.basedOn && b.rewrite))
            // A rewrite that drops the original's numbers loses the proof - keep the real line instead.
            .map((b) => (unsupportedNumbers(b.basedOn, b.rewrite).length > 0 ? { ...b, rewrite: b.basedOn } : b))
            // "Built X" must not come back as "Build X".
            .map((b) => ({ ...b, rewrite: matchSourceTense(b.rewrite, b.basedOn) }))
            .slice(0, 5)
        : [];
      if (!summary || bullets.length === 0) return null;
      return { keywords: strList(r.keywords, 8, 80), missingKeywords: strList(r.missingKeywords, 8, 80), summary, bullets };
    },
  });
  if (!result) return NextResponse.json({ error: "Couldn't tailor this one right now. Please try again." }, { status: 502 });

  // Flag (rather than silently ship) any number the model introduced.
  const flagged = unsupportedNumbers(`${result.summary} ${result.bullets.map((b) => b.rewrite).join(" ")}`, candidate);

  const text = [
    "### Keywords you can honestly use",
    result.keywords.length ? result.keywords.map((k) => `- ${k}`).join("\n") : "- (none found)",
    result.missingKeywords.length
      ? `\n### Keywords you can't claim yet\n${result.missingKeywords.map((k) => `- ${k}`).join("\n")}\n\nDon't add these to your resume until you can back them up.`
      : "",
    "\n### Tailored summary",
    result.summary,
    ...(() => {
      // A line that already says what this job wants is kept as is - shown
      // once as "keep", never printed twice as a fake rewrite.
      const same = (b: { basedOn: string; rewrite: string }) =>
        b.rewrite.trim().replace(/[.\s]+$/, "").toLowerCase() === b.basedOn.trim().replace(/[.\s]+$/, "").toLowerCase();
      const changed = result.bullets.filter((b) => !same(b));
      const kept = result.bullets.filter(same);
      return [
        changed.length
          ? `\n### Rewritten bullets\n${changed.map((b) => `- **${b.rewrite}**\n  - Based on: _${b.basedOn}_`).join("\n")}`
          : "",
        kept.length
          ? `\n### Already strong for this job - keep as is\n${kept.map((b) => `- ${b.basedOn}`).join("\n")}`
          : "",
      ];
    })(),
    flagged.length
      ? `\n> Check these numbers before using: ${flagged.join(", ")}. They don't appear in your profile.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return NextResponse.json({ text });
}
