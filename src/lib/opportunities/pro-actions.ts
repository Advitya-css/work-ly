"use server";

import { getCurrentUser } from "@/lib/auth";
import { getFullCareerProfile } from "@/lib/career/get-full-profile";
import { getOpportunityWithJobById } from "@/lib/opportunities/get-with-job";
import { generateTailoredApplication, generateFollowUpEmail } from "@/lib/ai/providers/tailor-ai";
import { aiProvider } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rate-limit";


export async function generateTailoredResumeAction(opportunityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.isPro) throw new Error("Pro required");
  if (!(await checkRateLimit(`pro_ai_${user.id}`, 10, 3600))) {
    throw new Error("Too many requests. Please try again later.");
  }

  const [profile, opp] = await Promise.all([
    getFullCareerProfile(user.id),
    getOpportunityWithJobById(user.id, opportunityId)
  ]);

  if (!opp) throw new Error("Opportunity not found");

  const tailored = await generateTailoredApplication(profile, opp.job);
  
  return {
    coverLetter: tailored.coverLetter,
    resumeBullets: tailored.resumeBullets
  };
}

export async function generateOutreachEmailAction(opportunityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.isPro) throw new Error("Pro required");
  if (!(await checkRateLimit(`pro_ai_${user.id}`, 10, 3600))) {
    throw new Error("Too many requests. Please try again later.");
  }

  const [profile, opp] = await Promise.all([
    getFullCareerProfile(user.id),
    getOpportunityWithJobById(user.id, opportunityId)
  ]);

  if (!opp) throw new Error("Opportunity not found");

  const prompt = `You are an elite executive headhunter. Your client wants to bypass the "Easy Apply" black hole and cold email the Hiring Manager directly for this role.

CLIENT PROFILE:
Headline: ${profile.profile?.headline || ""}
Skills: ${profile.skills.map((s: any) => s.name).join(", ")}
Experience: ${profile.experiences.map((e: any) => e.title + " at " + e.company).join(", ")}

TARGET JOB:
Title: ${opp.job.title}
Company: ${opp.job.company}

Write a highly strategic, confident, and short (max 4 sentences) cold email or LinkedIn message to the likely hiring manager.
Do NOT use generic corporate fluff. Do not ask for a job. Point out ONE specific way the client's background perfectly aligns with the company's presumed needs for this role, and ask for a quick chat. 
Return ONLY the email text. No markdown fences.`;

  const res = await aiProvider.complete({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return { email: res.content.trim() };
}

export async function generateInterviewPrepAction(opportunityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.isPro) throw new Error("Pro required");
  if (!(await checkRateLimit(`pro_ai_${user.id}`, 10, 3600))) {
    throw new Error("Too many requests. Please try again later.");
  }

  const [profile, opp] = await Promise.all([
    getFullCareerProfile(user.id),
    getOpportunityWithJobById(user.id, opportunityId)
  ]);

  if (!opp) throw new Error("Opportunity not found");

  const prompt = `You are a Senior Technical Recruiter at ${opp.job.company}. You are interviewing the candidate for the ${opp.job.title} position.

Here is the job description:
${opp.job.description?.slice(0, 2000)}

Generate 5 highly specific, difficult interview questions you would ask them, based on their exact profile and the job description. For each question, explain what a "red flag" answer would be and what a "green flag" (hireable) answer would be.

Return strictly valid JSON matching this schema:
{
  "questions": [
    {
      "question": "The tough question...",
      "redFlag": "They talk too much about X...",
      "greenFlag": "They give a specific example of Y..."
    }
  ]
}
Return ONLY the JSON. No markdown fences.`;

  const res = await aiProvider.complete({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    responseSchema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              redFlag: { type: "string" },
              greenFlag: { type: "string" }
            },
            required: ["question", "redFlag", "greenFlag"],
            additionalProperties: false
          }
        }
      },
      required: ["questions"],
      additionalProperties: false
    }
  });

  if (res.parsed) {
    return res.parsed;
  }
  
  try {
    const raw = res.content.replace(/^[\s\S]*?\{/, "{").replace(/\s*\}[\s\S]*$/, "}");
    const parsed = JSON.parse(raw) as any;
    return parsed;
  } catch (err) {
    console.error("Interview prep error:", err, res.content);
    throw new Error("Failed to generate interview prep.");
  }
}
