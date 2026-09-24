import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { aiProvider } from "@/lib/ai";
import { NO_FABRICATION_RULES, candidateBrief, cleanInput, withinProAiBudget } from "@/lib/ai/career-context";

export const maxDuration = 60;

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!(await withinProAiBudget(user.id))) {
    return NextResponse.json({ error: "You've used a lot of AI tools this hour. Try again in a little while." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const baseOffer = cleanInput(body.baseOffer, 60);
  const targetSalary = cleanInput(body.targetSalary, 60);
  const leverage = cleanInput(body.leverage, 1200);
  if (!baseOffer || !targetSalary) {
    return NextResponse.json({ error: "Enter the offer you received and the number you want." }, { status: 400 });
  }

  const { id } = await context.params;
  const [app, profile] = await Promise.all([getApplicationWithJobById(user.id, id), getFullCareerProfile(user.id)]);
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const prompt = `Write a counter-offer email from the candidate to the recruiter.
ROLE: ${app.job?.title ?? app.roleTitle} at ${app.company ?? "the company"}
OFFER RECEIVED: ${baseOffer}
COUNTER WITH: ${targetSalary}
CANDIDATE'S OWN CONTEXT / LEVERAGE: "${leverage || "none given"}"

CANDIDATE
=========
${candidateBrief(profile, 5000)}

Rules: warm, confident, specific. Thank them, restate enthusiasm, anchor on the counter number, justify it with 2-3 REAL points from the candidate section or their stated leverage, propose a quick call, and leave room for non-salary levers (joining bonus, equity, review timeline) if the number can't move. Under 180 words. Output Subject line then body. Sign as [Your Name].
${NO_FABRICATION_RULES}`;

  try {
    const result = await aiProvider.complete({ messages: [{ role: "user", content: prompt }], temperature: 0.4 });
    const text = result.content.trim();
    if (!text) throw new Error("empty");
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[workly:negotiate] AI error:", err);
    return NextResponse.json({ error: "Couldn't draft the email right now. Please try again." }, { status: 502 });
  }
}
