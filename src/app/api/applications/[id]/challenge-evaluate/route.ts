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

  const { title, description, code } = await req.json();

  const params = await context.params;
  const app = await getApplicationWithJobById(user.id, params.id);
  
  const roleTitle = app?.job?.title ?? app?.roleTitle ?? "Professional";
  const isTechnical = /engineer|developer|software|data|programmer|frontend|backend|fullstack|tech|it|cloud|security/i.test(roleTitle);

  const prompt = `Act as a Hiring Manager at ${app?.company || 'a top company'}.
You are reviewing a candidate's submission for a scenario/take-home assignment for the role of ${roleTitle}.

Scenario Title: ${title}
Scenario Description: ${description}

Candidate's Submission:
\`\`\`
${code}
\`\`\`

Review this submission ruthlessly but fairly. Format your response exactly like this in markdown:

### Score: [X]/10

${isTechnical ? 
  "**1. Correctness & Edge Cases:**\n[Did they solve the problem? What edge cases did they miss?]\n\n**2. Time & Space Complexity:**\n[Analyze their Big O time and space complexity.]\n\n**3. Readability & Best Practices:**\n[Are variables named well? Is it clean?]" 
  : 
  "**1. Problem Solving & Judgment:**\n[Did they handle the situation correctly? Was their judgment sound?]\n\n**2. Communication & Tone:**\n[Is their response professional, empathetic, or appropriate for the context?]\n\n**3. What They Missed:**\n[Identify any blind spots or better ways to handle the scenario.]"
}

**How to do it perfectly:**
[Provide a concise example of the ideal way to handle this scenario or write the code.]`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error("AI evaluation error:", err);
    return NextResponse.json({ error: "Failed to evaluate code." }, { status: 500 });
  }
}
