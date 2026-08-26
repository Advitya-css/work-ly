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

  const { baseOffer, targetSalary, leverage } = await req.json();

  const params = await context.params;
  const app = await getApplicationWithJobById(user.id, params.id);
  
  const prompt = `Act as an expert career coach and master negotiator. 
I am applying for the role of ${app?.job?.title ?? "a role"} at ${app?.company || 'a company'}.
I was offered a base salary of ${baseOffer}. 
I want to counter-offer for ${targetSalary}.
Here is some additional context or leverage I have: "${leverage}".

Write a polite, professional, yet firm email to the recruiter proposing this counter-offer. 
Do not be arrogant, but clearly state the value I bring.
Provide only the email text (Subject and Body).`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error("AI evaluation error:", err);
    return NextResponse.json({ error: "Failed to generate script." }, { status: 500 });
  }
}
