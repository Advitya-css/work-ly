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

  const { question, answer } = await req.json();
  if (!question || !answer) {
    return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
  }

  const params = await context.params;
  const app = await getApplicationWithJobById(user.id, params.id);
  
  const prompt = `You are a tough, world-class technical interviewer.
I am applying for the role of ${app?.job?.title ?? "a role"} at ${app?.company || 'a company'}.

I was asked this interview question:
"${question}"

Here is my transcribed spoken answer:
"${answer}"

Evaluate my answer strictly. Format your response exactly like this in markdown:
### Score: [X]/10

**Feedback:**
[Direct, ruthless feedback on what I missed, if I rambled, and if I used the STAR method effectively.]

**How to say it better:**
[A concise, 3-4 sentence example of a perfect answer]`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error("AI evaluation error:", err);
    return NextResponse.json({ error: "Failed to evaluate answer." }, { status: 500 });
  }
}
