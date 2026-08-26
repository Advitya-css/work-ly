import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { googleGenAIProvider } from "@/lib/ai/providers/google-genai";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60; // Allow 60s for AI generation

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAllowed = await checkRateLimit(`ai:app:${user.id}`, 20, 3600);
  if (!isAllowed) {
    return NextResponse.json({ error: "Too many AI requests. Please try again later." }, { status: 429 });
  }

  const params = await context.params;
  const app = await getApplicationWithJobById(user.id, params.id);
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  
  const job = app.job;
  const profile = await getFullCareerProfile(user.id);
  
  const candidateSkills = profile.skills.map(s => s.name).join(", ");
  const candidateExperiences = profile.experiences.map(e => `${e.title} at ${e.company} (${e.description || 'No description'})`).join("\n");
  
  let jobDetails = app.job?.title ?? "a role";
  if (job) {
    jobDetails = `Title: ${job.title}
Company: ${job.company || app.company || 'Unknown'}
Requirements:\n${job.requirements?.map(r => r.text).join("\n") || job.description || job.title}`;
  }

  const prompt = `You are a world-class executive resume writer and career coach.
Your client is applying for the role of ${app.job?.title ?? "a role"} at ${app.company || 'a company'}.

Here is the Job Description / Requirements:
${jobDetails}

Here is the candidate's current profile:
Skills: ${candidateSkills || "None listed."}
Experience:
${candidateExperiences || "None listed."}

Your Task:
Generate a powerful Application Strategy for this specific job. 
Include exactly two sections:

### 1. Resume Bullet Tweaks
Suggest 3 specific ways the candidate should rewrite their current experience bullets to perfectly match the keywords and needs of this job. Show a "Before" (based on their actual experience) and an "After" (optimized for this job).

### 2. Cover Letter Draft
Write a concise, modern, and highly persuasive cover letter (under 200 words). Do not use generic fluff. Make it sound human, referencing their actual skills mapping to the job requirements. Use placeholders like [Your Name] where appropriate.

Format as plain text. Do NOT use asterisks (*) for bolding or italics. Use standard dashes (-) for bullet points. Keep it clean and readable.`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5, // Slightly lower for more precise, less hallucinatory text
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error(err);
    console.error("AI route error:", err);
    return NextResponse.json({ error: "Failed to generate AI response. Please try again later." }, { status: 500 });
  }
}
