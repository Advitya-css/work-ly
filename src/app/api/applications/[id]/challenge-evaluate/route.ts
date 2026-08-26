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
  
  const prompt = `Act as a Staff Software Engineer at ${app?.company || 'a top tech company'}.
You are doing a code review on a candidate's submission for a take-home challenge.

Challenge Title: ${title}
Challenge Description: ${description}

Candidate's Code Submission:
\`\`\`
${code}
\`\`\`

Review this code ruthlessly but fairly. Format your response exactly like this in markdown:

### Code Review Score: [X]/10

**1. Correctness & Edge Cases:**
[Did they solve the problem? What edge cases did they miss?]

**2. Time & Space Complexity:**
[Analyze their Big O time and space complexity. Could it be optimized?]

**3. Readability & Best Practices:**
[Are variables named well? Is it clean?]

**How to Write it Like a Senior Engineer:**
[Provide a small, optimized code snippet showing the ideal way to solve it]`;

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
