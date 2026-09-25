import type { ApplicationStatus } from "@/lib/db/types";
import { TOOLS, applicationToolHref, type ToolId } from "./tools";

/**
 * "Your next move" - the one thing worth doing now.
 *
 * A dashboard of equal-weight cards asks a new user to already know what
 * Work-ly can do. This picks a single action from where they actually are,
 * most time-sensitive first: a live offer beats an interview, an interview
 * beats tailoring a resume, and so on down to finding more jobs. Every
 * feature gets introduced this way at the moment it's useful, which is the
 * only moment anyone reads an introduction.
 *
 * Pure: the dashboard gathers the facts, this decides.
 */

export interface NextMoveApplication {
  id: string;
  status: ApplicationStatus;
  roleTitle: string;
  company: string | null;
  opportunityId: string | null;
  dateApplied: Date | null;
  reachedAssessmentAt: Date | null;
  reachedInterviewAt: Date | null;
  reachedOfferAt: Date | null;
  updatedAt: Date;
}

export interface NextMoveInput {
  hasProfile: boolean;
  discoveredCount: number;
  topDiscovered: { title: string; company: string | null; fitScore: number | null } | null;
  /** Tracked but not yet applied, highest priority first. */
  topOpportunity: { id: string; title: string | null; company: string | null; status: string } | null;
  trackedCount: number;
  applications: NextMoveApplication[];
  hasDreamJob: boolean;
  hasPathway: boolean;
  pathwayNext: string | null;
  now?: Date;
}

export interface NextMove {
  id: string;
  /** Why this, why now - one short line above the title. */
  reason: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  toolId?: ToolId;
  pro: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function at(company: string | null): string {
  return company ? ` at ${company}` : "";
}

function lastActivity(app: NextMoveApplication): number {
  const dates = [app.reachedInterviewAt, app.reachedAssessmentAt, app.dateApplied]
    .filter((d): d is Date => d != null)
    .map((d) => new Date(d).getTime());
  return dates.length ? Math.max(...dates) : new Date(app.updatedAt).getTime();
}

/**
 * Every move worth making now, most time-sensitive first. The dashboard's
 * single "next move" is the first of these; the Pro briefing shows the top
 * few. One move per live application (an offer AND an interview are both
 * today's business), then the profile-wide moves.
 */
export function listMoves(input: NextMoveInput): NextMove[] {
  const now = (input.now ?? new Date()).getTime();
  const moves: NextMove[] = [];

  if (!input.hasProfile) {
    return [{
      id: "upload-resume",
      reason: "Start here",
      title: "Upload your resume",
      body: "Every fit score, match and tailored resume in Work-ly is built from it. It takes about a minute, and you can fix anything it reads wrong.",
      cta: { label: "Upload my resume", href: "/career-profile" },
      pro: false,
    }];
  }

  const byStatus = (...statuses: ApplicationStatus[]) =>
    [...input.applications.filter((a) => statuses.includes(a.status))].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  for (const offer of byStatus("OFFER").slice(0, 2)) {
    moves.push({
      id: "counter-offer",
      reason: "You have an offer",
      title: `Negotiate your offer${at(offer.company)}`,
      body: "Most employers expect a counter-offer. Enter the number they gave you and the one you want, and get a professional email built on your real leverage.",
      cta: { label: "Draft my counter-offer", href: applicationToolHref(offer.id, "counter-offer") },
      secondary: { label: "Already accepted? Add it to your profile", href: applicationToolHref(offer.id, "accept-offer") },
      toolId: "counter-offer",
      pro: TOOLS["counter-offer"].pro,
    });
  }

  for (const interview of byStatus("FINAL_INTERVIEW", "INTERVIEW").slice(0, 2)) {
    moves.push({
      id: "mock-interview",
      reason: interview.status === "FINAL_INTERVIEW" ? "Final round coming up" : "You have an interview",
      title: `Rehearse for ${interview.roleTitle}${at(interview.company)}`,
      body: "Run a mock interview: an AI hiring manager asks the questions this role is likely to get, listens to your spoken answers and tells you what to fix.",
      cta: { label: "Start a mock interview", href: applicationToolHref(interview.id, "mock-interview") },
      secondary: interview.opportunityId
        ? { label: "See likely interview questions", href: `/opportunities/${interview.opportunityId}` }
        : undefined,
      toolId: "mock-interview",
      pro: TOOLS["mock-interview"].pro,
    });
  }

  for (const assessment of byStatus("ASSESSMENT").slice(0, 2)) {
    moves.push({
      id: "practice-task",
      reason: "You have an assessment",
      title: `Practise for the ${assessment.company ?? "company"} assessment`,
      body: "Get a realistic task for this exact role - a coding challenge or an on-the-job scenario - and honest feedback on your answer before you do the real one.",
      cta: { label: "Try a practice task", href: applicationToolHref(assessment.id, "practice-task") },
      toolId: "practice-task",
      pro: TOOLS["practice-task"].pro,
    });
  }

  const quietOnes = input.applications
    .filter((a) => a.status === "APPLIED" && now - lastActivity(a) >= 7 * DAY_MS)
    .sort((a, b) => lastActivity(a) - lastActivity(b))
    .slice(0, 3);
  for (const quiet of quietOnes) {
    const days = Math.floor((now - lastActivity(quiet)) / DAY_MS);
    moves.push({
      id: "follow-up",
      reason: `No reply in ${days} days`,
      title: `Follow up${at(quiet.company)}`,
      body: "A short, polite follow-up a week or two after applying is normal and often gets a stalled application read. Work-ly drafts it for you.",
      cta: { label: "Draft a follow-up email", href: applicationToolHref(quiet.id, "follow-up") },
      toolId: "follow-up",
      pro: TOOLS["follow-up"].pro,
    });
  }

  for (const preparing of byStatus("PREPARING", "SAVED").slice(0, 2)) {
    moves.push({
      id: "tailor",
      reason: "Ready to apply?",
      title: `Tailor your resume for ${preparing.roleTitle}${at(preparing.company)}`,
      body: "A resume rewritten for this posting - from your real experience, never invented - gets past screeners that a generic one doesn't.",
      cta: preparing.opportunityId
        ? { label: "Get my tailored resume", href: `/opportunities/${preparing.opportunityId}/resume` }
        : { label: "Tailor my resume bullets", href: applicationToolHref(preparing.id, "resume-bullets") },
      toolId: preparing.opportunityId ? "tailored-resume" : "resume-bullets",
      pro: true,
    });
  }

  if (input.topOpportunity) {
    const o = input.topOpportunity;
    const name = o.title ?? "your top job";
    moves.push({
      id: "apply-top",
      reason: "Your highest-priority job",
      title: `Apply to ${name}${at(o.company)}`,
      body: "It's the best-scoring job you've tracked and you haven't applied yet. Open it for the fit breakdown, a tailored resume and a note to the hiring manager.",
      cta: { label: "Open it", href: `/opportunities/${o.id}` },
      pro: false,
    });
  }

  if (input.discoveredCount === 0) {
    moves.push({
      id: "discover",
      reason: "Next step",
      title: "Find jobs that fit you",
      body: "Work-ly searches job boards and company career pages for roles like yours and scores each one against your profile, so you only read the ones worth it.",
      cta: { label: "Find my matches", href: "/discover" },
      toolId: "discover",
      pro: false,
    });
  }

  if (input.trackedCount === 0 && input.topDiscovered) {
    const t = input.topDiscovered;
    moves.push({
      id: "review-matches",
      reason: `${input.discoveredCount} matches waiting`,
      title: t.fitScore != null ? `${t.title}${at(t.company)}: Candidate Fit is ${t.fitScore}/100` : `${t.title}${at(t.company)}`,
      body: "That's your strongest match so far. Press Analyze & track on any job you like - it moves into your pipeline and unlocks tailoring, outreach and interview prep for it.",
      cta: { label: "Review my matches", href: "/discover" },
      pro: false,
    });
  }

  if (!input.hasDreamJob) {
    moves.push({
      id: "dream-job",
      reason: "Think one step further",
      title: "How close are you to your dream job?",
      body: "Paste a posting for a role you'd really love. Work-ly scores how ready you are and names the gaps between you and it. Your first one is free.",
      cta: { label: "Check my dream job", href: "/dream-job" },
      toolId: "dream-job",
      pro: false,
    });
  } else if (!input.hasPathway) {
    moves.push({
      id: "pathway",
      reason: "You know the gaps",
      title: "Turn them into a plan",
      body: "Build a step-by-step pathway from your dream-job gaps: ordered steps and a 30/60/90-day action plan you can tick off.",
      cta: { label: "Build my pathway", href: "/career-path" },
      toolId: "pathway",
      pro: TOOLS.pathway.pro,
    });
  } else if (input.pathwayNext) {
    moves.push({
      id: "pathway-next",
      reason: "Next on your plan",
      title: input.pathwayNext,
      body: "Mark it complete when it's done - your pathway and fit scores move with you.",
      cta: { label: "Open my pathway", href: "/career-path" },
      pro: false,
    });
  }

  moves.push({
    id: "discover-more",
    reason: "Keep the pipeline full",
    title: "Look for new matches",
    body: "New listings arrive every day. Run Discover again to see what's come in since last time.",
    cta: { label: "Find new matches", href: "/discover" },
    toolId: "discover",
    pro: false,
  });
  return moves;
}

/** The one thing worth doing now (the dashboard's "Your next move"). */
export function pickNextMove(input: NextMoveInput): NextMove {
  return listMoves(input)[0];
}
