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
  
  const roleTitle = app?.job?.title ?? app?.roleTitle ?? "Professional";
  const jobDetails = app?.job?.description || roleTitle;
  
  const isTechnical = /engineer|developer|software|data|programmer|frontend|backend|fullstack|tech|it|cloud|security/i.test(roleTitle);

  const prompt = `Act as a Hiring Manager at ${app?.company || 'a top company'}.
You need to create a realistic, domain-specific take-home assignment or scenario for a candidate applying for: ${roleTitle}.

Context from the job description:
${jobDetails.substring(0, 1500)}

Instructions based on role type:
${isTechnical 
  ? "This is a technical role. Generate a realistic coding challenge relevant to this company's business model (e.g. designing a specific API, writing a specific algorithm). Do not use generic LeetCode."
  : "This is a non-technical role (e.g. Hospitality, Marketing, Sales). Generate a realistic, difficult on-the-job scenario they must resolve in writing. For example, for a Waitress, a scenario handling a furious customer and a kitchen delay simultaneously."}

Return the result as a strict JSON object with NO markdown formatting, NO comments. Format:
{
  "title": "String (Name of the challenge/scenario)",
  "description": "String (Detailed markdown description of the problem, constraints, and what you expect from their answer)"
}`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    
    let challenge = { title: "Custom Scenario", description: "Read the scenario and provide your solution." };
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
