import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { googleGenAIProvider } from "@/lib/ai/providers/google-genai";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
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
  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  
  const job = app.job;
  const profile = await getFullCareerProfile(user.id);
  const candidateSkills = profile.skills.map(s => s.name).join(", ");
  
  let jobDetails = app.job?.title ?? "a role";
  if (job) {
    jobDetails = `Requirements:\n${job.requirements?.join("\n") || job.description || job.title}`;
  }

  const prompt = `You are a tough, world-class technical interviewer.
I am applying for the role of ${app.job?.title ?? "a role"} at ${app.company || 'a company'}.

Here are the job details:
${jobDetails}

Here are my confirmed skills:
${candidateSkills || "None listed."}

Your Task:
Generate exactly 4 tough, highly realistic interview questions that I am likely to be asked for this specific role. Focus on testing areas where my skills might be lacking or need deep probing.
Do not use generic behavioral questions.

Return the result as a strict JSON array of strings. No markdown formatting, no comments, just a JSON array like:
["Question 1?", "Question 2?", "Question 3?", "Question 4?"]`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    
    // Attempt to parse JSON safely
    let questions = [];
    try {
       const raw = result.content.replace(/```json/g, "").replace(/```/g, "").trim();
       questions = JSON.parse(raw);
       if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch(e) {
       // fallback
       questions = ["Tell me about a time you had to adapt quickly.", "What is your biggest technical weakness for this role?", "How do you handle disagreements with stakeholders?"];
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json({ error: "Failed to generate AI response." }, { status: 500 });
  }
}
