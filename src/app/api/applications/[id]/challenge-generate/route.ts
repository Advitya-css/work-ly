import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { googleGenAIProvider } from "@/lib/ai/providers/google-genai";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAllowed = await checkRateLimit(`ai:app:${user.id}`, 20, 3600);
  if (!isAllowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const params = await context.params;
  const app = await getApplicationWithJobById(user.id, params.id);
  
  const jobDetails = app?.job?.description || app?.job?.title || "software engineer";

  const prompt = `Act as a Staff Software Engineer at ${app?.company || 'a top tech company'}.
You need to create a realistic, domain-specific coding challenge for a candidate applying for: ${app?.job?.title ?? "Software Engineer"}.

Context from the job description:
${jobDetails.substring(0, 1500)}

Generate a coding problem that is directly relevant to what this company actually does (e.g., if it's Stripe, make it about payments; if it's Airbnb, make it about bookings).
Do not ask generic LeetCode questions (no "reverse a linked list"). Make it a real-world business logic problem.

Return the result as a strict JSON object with NO markdown formatting, NO comments. Format:
{
  "title": "String (Name of the challenge)",
  "description": "String (Detailed markdown description of the problem, constraints, and an example input/output)"
}`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    
    let challenge = { title: "Custom Challenge", description: "Write a function to solve a core business problem." };
    try {
       const raw = result.content.replace(/```json/g, "").replace(/```/g, "").trim();
       challenge = JSON.parse(raw);
    } catch(e) {
       console.error("Failed to parse challenge JSON");
    }

    return NextResponse.json(challenge);
  } catch (err) {
    console.error("AI evaluation error:", err);
    return NextResponse.json({ error: "Failed to generate challenge." }, { status: 500 });
  }
}
