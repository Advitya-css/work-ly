import { aiProvider } from "@/lib/ai";
import type { CareerProfile, Job } from "@/lib/db/types";

export interface TailoredApplication {
  coverLetter: string;
  resumeBullets: string[];
}

export async function generateTailoredApplication(
  profile: CareerProfile,
  job: Job,
): Promise<TailoredApplication> {
  const prompt = `You are an expert career coach and executive resume writer.
Your goal is to help the candidate tailor their application to perfectly match the job description, ensuring they pass the ATS (Applicant Tracking System) and impress the hiring manager.

=== CANDIDATE PROFILE ===
Experience: \${profile.experience ?? "Not provided"}
Skills: \${profile.skills ?? "Not provided"}
Education: \${profile.education ?? "Not provided"}
University: \${profile.university ?? "Not provided"}
Major: \${profile.major ?? "Not provided"}

=== TARGET JOB ===
Title: \${job.title}
Company: \${job.company}
Description:
\${job.description}

=== INSTRUCTIONS ===
1. Generate an elegant, highly customized cover letter (3-4 paragraphs) that connects the candidate's background to the specific needs of the job. Do not use generic fluff. Use a professional, confident tone.
2. Generate 4-6 highly tailored resume bullet points. These bullet points should blend the candidate's actual experience with the exact keywords and skills requested in the job description. Start each bullet with a strong action verb.

Output strict JSON in the following format. No prose, no markdown fences:
{
  "coverLetter": "The full text of the cover letter...",
  "resumeBullets": [
    "Bullet 1...",
    "Bullet 2..."
  ]
}`;

  const res = await aiProvider.complete({ messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  try {
    const raw = res.content.replace(/^[\s\S]*?\{/, "{").replace(/\s*\}\s*$/, "}");
    const parsed = JSON.parse(raw) as TailoredApplication;
    
    if (!parsed.coverLetter || !Array.isArray(parsed.resumeBullets)) {
      throw new Error("Invalid schema from AI");
    }
    
    return parsed;
  } catch (error) {
    console.error("Tailoring parsing error:", error, res.content);
    throw new Error("Failed to generate tailored application.");
  }
}
