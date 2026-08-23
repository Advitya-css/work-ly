import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplicationWithJobById } from "@/lib/applications/get-with-job";
import { googleGenAIProvider } from "@/lib/ai/providers/google-genai";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";

export const maxDuration = 60; // Allow 60s for AI generation

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  const app = await getApplicationWithJobById(params.id, user.id);
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
Generate 5 tough, highly realistic interview questions that I am likely to be asked for this specific role. Focus on the job requirements, especially testing areas where my skills might be lacking or need deep probing.
For each question, provide a brief "How to Answer" rubric/tip.
Do not use generic behavioral questions like "what is your biggest weakness". Make them specific to the industry/role.
Format as clean Markdown with bolding and bullet points.`;

  try {
    const result = await googleGenAIProvider.complete({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    return NextResponse.json({ text: result.content });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to generate interview prep." }, { status: 500 });
  }
}
