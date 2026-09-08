"use server";

import { cookies, headers } from "next/headers";

import { aiProvider } from "@/lib/ai";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * One free scan per device, enforced with a long-lived cookie rather than an
 * account - the whole point of this page is that it works before signup.
 * Not unbeatable (clearing cookies resets it), but that's an acceptable
 * tradeoff for a free teaser; the IP-based check below is the backstop for
 * anyone scripting past the cookie rather than the primary gate.
 */
const FREE_GRADER_COOKIE = "workly_free_grader_used";
const FREE_GRADER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function scoreResumeAction(resumeText: string, jobDescriptionText: string) {
  if (!resumeText || !jobDescriptionText) {
    return { error: "Please provide both a resume and a job description." };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(FREE_GRADER_COOKIE)) {
    return {
      error:
        "You've already used your free scan on this device. Create a free account to keep scoring resumes.",
    };
  }

  // Backstop against someone working around the cookie (private window,
  // cookies cleared) by scripting this from one network. Generous on
  // purpose - the cookie above is the real "once per device" gate, this
  // only exists to stop a single source from running up the AI bill.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const withinRateLimit = await checkRateLimit(`free-grader:${ip}`, 5, 60 * 60);
  if (!withinRateLimit) {
    return { error: "Too many free scans from this network recently. Please try again later." };
  }

  // To prevent abuse, enforce some limits (8000 chars roughly)
  const safeResume = stripPromptInjectionMarkers(resumeText.slice(0, 8000));
  const safeJob = stripPromptInjectionMarkers(jobDescriptionText.slice(0, 8000));

  const schema = {
    type: "object",
    properties: {
      score: { type: "number", description: "Fit score out of 100" },
      strengths: { type: "array", items: { type: "string" }, description: "3 reasons why the candidate is a good fit" },
      gaps: { type: "array", items: { type: "string" }, description: "3 missing keywords or skills (very specific)" },
    },
    required: ["score", "strengths", "gaps"],
  };

  try {
    const result = await aiProvider.complete({
      messages: [
        {
          role: "system",
          content:
            "You are an expert ATS (Applicant Tracking System) parser and recruiter. Your job is to aggressively score a candidate's resume against a job description. Return a score out of 100, exactly 3 strengths, and exactly 3 brutal gaps (missing skills).",
        },
        {
          role: "user",
          content: `Job Description:\n${safeJob}\n\nResume:\n${safeResume}`,
        },
      ],
      responseSchema: schema,
      temperature: 0.1,
    });

    if (!result.parsed) {
      throw new Error("Failed to parse AI response.");
    }

    // Only spend the visitor's one free scan on a request that actually
    // succeeded - a failed AI call shouldn't burn their only try.
    cookieStore.set(FREE_GRADER_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FREE_GRADER_COOKIE_MAX_AGE,
    });

    return { data: result.parsed as { score: number; strengths: string[]; gaps: string[] } };
  } catch (error) {
    console.error("Free grader error:", error);
    return { error: "Failed to score resume. Please try again." };
  }
}
