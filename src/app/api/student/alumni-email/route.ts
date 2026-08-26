import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { googleGenAIProvider } from "@/lib/ai/providers/google-genai";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAllowed = await checkRateLimit(`ai:app:${user.id}`, 20, 3600);
  if (!isAllowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { targetCompany } = await req.json();
  const fullProfile = await getFullCareerProfile(user.id);
  
  const university = fullProfile.profile?.university || "my university";
  const major = fullProfile.profile?.major || "my degree";

  const prompt = `Act as an expert career coach and cold email strategist.
I am a recent or upcoming graduate from ${university} who majored in ${major}.
I want to send a cold LinkedIn message or email to an ALUMNI of my university who now works at ${targetCompany}.

Write a highly-converting, concise (under 150 words) cold email. 
The goal is NOT to ask for a job outright, but to ask for a brief 15-minute informational interview or coffee chat to learn about their transition from ${university} to ${targetCompany}.

Format: Provide the Subject Line, followed by the Body. Keep it professional, warm, and zero fluff. No emojis.`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error("AI evaluation error:", err);
    return NextResponse.json({ error: "Failed to generate email." }, { status: 500 });
  }
}
