"use server";

import { cookies, headers } from "next/headers";

import { screenPastedResume } from "@/lib/scoring/ai-evaluator";
import { MIN_COVERAGE_FOR_SCORE } from "@/lib/scoring/coverage";
import { stripPromptInjectionMarkers } from "@/lib/ai/prompt-injection-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";
import { FREE_AI_LIMIT_MESSAGE, spendAnonymousAi, spendFreeAi } from "@/lib/ai/allowance";

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
  // The limit message promises "create a free account to keep scoring" -
  // so a signed-in user is never held to the one-scan device cookie. They
  // get a per-account hourly cap instead (the same cost control, keyed to
  // them rather than to a browser).
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    if (!(await checkRateLimit(`free-grader-user:${user.id}`, 10, 60 * 60))) {
      return { error: "You've run a lot of checks this hour. Please try again a little later." };
    }
    if (!(await spendFreeAi(user))) return { error: FREE_AI_LIMIT_MESSAGE };
  } else if (cookieStore.get(FREE_GRADER_COOKIE)) {
    return {
      error:
        "You've already used your free scan on this device. Create a free account to keep scoring resumes.",
    };
  }

  // Backstop against someone working around the cookie (private window,
  // cookies cleared) by scripting this from one network. Generous on
  // purpose - the cookie above is the real "once per device" gate, this
  // only exists to stop a single source from running up the AI bill.
  // x-real-ip is set by the platform; the first x-forwarded-for entry is
  // whatever the client claimed and can be rotated to dodge the limit.
  const headerList = await headers();
  const ip =
    headerList.get("x-real-ip")?.trim() ||
    headerList.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown";
  // Signed-out visitors: 3 scans a day per network, and all of them share
  // the free accounts' daily AI total (see lib/ai/allowance.ts).
  if (!user) {
    const withinRateLimit = await checkRateLimit(`free-grader:${ip}`, 3, 24 * 60 * 60);
    if (!withinRateLimit || !(await spendAnonymousAi())) {
      return { error: "The free checker has hit today's limit from your network. Create a free account to keep checking resumes." };
    }
  }

  const safeResume = stripPromptInjectionMarkers(resumeText.slice(0, 8000));
  const safeJob = stripPromptInjectionMarkers(jobDescriptionText.slice(0, 8000));
  if (safeResume.trim().length < 200 || safeJob.trim().length < 200) {
    return { error: "Paste the full resume and the full job description (at least a few paragraphs each)." };
  }

  try {
    // The same grounded screen signed-in users get: every "you have this"
    // must quote the resume, and the score is computed from the verdicts.
    // It used to be a free-form model guess labelled an "ATS score", with
    // exactly three gaps forced even for a perfect match.
    const analysis = await screenPastedResume(safeResume, safeJob);
    if (!analysis || !analysis.screen) {
      return { error: "Our AI checker is overloaded right now. Your text is still here - try again in a minute." };
    }

    const open = analysis.screen.requirements
      .filter((r) => r.verdict === "missing" || r.verdict === "partial")
      .sort((a, b) => ({ critical: 0, important: 1, nice: 2 })[a.importance] - ({ critical: 0, important: 1, nice: 2 })[b.importance]);
    const met = analysis.screen.requirements.filter((r) => r.verdict === "met");
    const reliable = analysis.coverage >= MIN_COVERAGE_FOR_SCORE;

    // Only spend the visitor's one free scan on a request that actually
    // succeeded - a failed AI call shouldn't burn their only try.
    if (!user) cookieStore.set(FREE_GRADER_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FREE_GRADER_COOKIE_MAX_AGE,
    });

    return {
      data: {
        score: reliable ? analysis.fitScore : null,
        summary: analysis.screen.summary,
        strengths: met.slice(0, 4).map((r) => ({ requirement: r.requirement, evidence: r.evidenceQuote ?? "" })),
        gaps: open.slice(0, 5).map((r) => ({
          requirement: r.requirement,
          mustHave: r.importance === "critical",
          partly: r.verdict === "partial",
          fix: r.gapToClose ?? "",
        })),
      },
    };
  } catch (error) {
    console.error("Free grader error:", error);
    return { error: "Failed to score resume. Please try again." };
  }
}
