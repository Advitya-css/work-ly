import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
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
  const fullProfile = await getFullCareerProfile(user.id);
  
  if (!app?.job) {
    return NextResponse.json({ error: "No job description found for this application." }, { status: 400 });
  }

  const candidateProfile = `
Headline: ${fullProfile.profile?.headline || "None"}
Summary: ${fullProfile.profile?.summary || "None"}
Skills: ${fullProfile.skills.map(s => s.name).join(", ")}
Experience:
${fullProfile.experiences.map(e => `- ${e.title} at ${e.company} (${e.startDate} to ${e.endDate})\n  ${e.description}`).join("\n")}
`;

  const jobDetails = app.job.description || app.job.title;

  const prompt = `Act as an elite executive recruiter and ATS (Applicant Tracking System) optimizer.
I am applying for the role of ${app.job.title} at ${app.company}.

Here is my CURRENT background:
${candidateProfile.substring(0, 2000)}

Here is the TARGET JOB DESCRIPTION:
${(jobDetails || "").substring(0, 2000)}

Provide a highly optimized, tailored resume strategy for this exact role. Use the following markdown format EXACTLY:

### 🎯 ATS Keywords to Inject
[List 5-8 critical keywords from the job description that must exist in my resume]

### ✨ Tailored Professional Summary
[Write a 2-3 sentence tailored resume summary that perfectly bridges my background with their needs]

### 🔨 Optimized Bullet Points
[Take 3-4 aspects of my current experience and rewrite them into powerful, impact-driven bullet points that directly address the core requirements of the job description. Do not invent experience I don't have, but frame what I DO have perfectly for this role.]`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error("AI evaluation error:", err);
    return NextResponse.json({ error: "Failed to generate tailored resume." }, { status: 500 });
  }
}
