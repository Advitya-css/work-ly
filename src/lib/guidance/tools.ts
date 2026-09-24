import type { ApplicationStatus } from "@/lib/db/types";

/**
 * The one list of Work-ly's tools, named by what they do for you.
 *
 * Every surface that introduces a tool - the Guide, the stage roadmap on an
 * application, the pop-up when an application moves stage, the dashboard's
 * next move - reads from here, so a tool is never called one thing in the
 * Guide and another on the card itself. `brand` is the product name the
 * tool had before (War Room, Hiring Manager Bypass, ...): kept as a small
 * subtitle so returning users still recognise it, but never the headline,
 * because nobody scans a page for "War Room" the night before an interview.
 */

export type ToolId =
  | "discover"
  | "analyze-job"
  | "dream-job"
  | "pathway"
  | "tailored-resume"
  | "cover-letter"
  | "hiring-manager"
  | "interview-questions"
  | "resume-bullets"
  | "application-strategy"
  | "follow-up"
  | "mock-interview"
  | "practice-task"
  | "counter-offer"
  | "accept-offer";

export type ToolPlace = "career" | "jobs" | "opportunity" | "application";

export interface Tool {
  id: ToolId;
  /** What it does, in the words someone would search for. */
  name: string;
  /** The previous product name, shown small under `name`. */
  brand?: string;
  /** One line: the outcome, not the mechanism. */
  blurb: string;
  pro: boolean;
  /** "First one free" style note for tools that are partly free. */
  freeNote?: string;
  place: ToolPlace;
  /**
   * For application tools: the stage at which the tool appears on the
   * application page. Tools with no stage are available at every stage.
   */
  unlocksAt?: ApplicationStatus;
  /** DOM id of the tool's card on its page, for deep links. */
  anchor?: string;
}

export const TOOLS: Record<ToolId, Tool> = {
  discover: {
    id: "discover",
    name: "Find jobs that fit you",
    brand: "Discover",
    blurb: "Pulls real listings from job boards and company career pages and scores each one against your profile.",
    pro: false,
    place: "jobs",
  },
  "analyze-job": {
    id: "analyze-job",
    name: "Check a job you found",
    brand: "Analyze a job",
    blurb: "Paste any posting (or capture it from the page) to see your Candidate Fit, what you already match and what's missing.",
    pro: false,
    place: "jobs",
  },
  "dream-job": {
    id: "dream-job",
    name: "How close am I to my dream job?",
    brand: "Dream Job",
    blurb: "Scores how ready you are for a role you really want and names the biggest gaps between you and it.",
    pro: true,
    freeNote: "First one free",
    place: "career",
  },
  pathway: {
    id: "pathway",
    name: "A step-by-step plan to get there",
    brand: "Dream Pathway",
    blurb: "Turns the gaps to your dream job into ordered steps and a 30/60/90-day action plan you can tick off.",
    pro: true,
    place: "career",
  },
  "tailored-resume": {
    id: "tailored-resume",
    name: "Resume tailored to this job",
    brand: "Tailored resume",
    blurb: "An apply-ready resume for one posting, rewritten only from facts on your profile. Print or save as PDF.",
    pro: true,
    place: "opportunity",
  },
  "cover-letter": {
    id: "cover-letter",
    name: "Cover letter for this job",
    brand: "Application Tailor",
    blurb: "A cover letter draft plus resume bullet rewrites for one specific posting, ready to copy.",
    pro: true,
    place: "opportunity",
  },
  "hiring-manager": {
    id: "hiring-manager",
    name: "Message the hiring manager",
    brand: "Hiring Manager Bypass",
    blurb: "A short, specific note to the person who'll actually decide, so you're not just one more resume in the pile.",
    pro: true,
    place: "opportunity",
  },
  "interview-questions": {
    id: "interview-questions",
    name: "Likely interview questions",
    brand: "Interview Intel",
    blurb: "Questions this company is likely to ask you, aimed at your weak spots, with what strong and weak answers sound like.",
    pro: true,
    place: "opportunity",
  },
  "resume-bullets": {
    id: "resume-bullets",
    name: "Resume bullets for this job",
    brand: "AI Resume Tailor",
    blurb: "Rewrites your experience bullets and keywords against this exact job description, without inventing anything.",
    pro: true,
    place: "application",
    anchor: "tool-resume-bullets",
  },
  "application-strategy": {
    id: "application-strategy",
    name: "Your angle + cover letter",
    brand: "Auto-Tailor",
    blurb: "Your strongest honest pitch for this role, what a screener may flag, and a cover letter built on it.",
    pro: true,
    place: "application",
    anchor: "tool-application-strategy",
  },
  "follow-up": {
    id: "follow-up",
    name: "Follow-up email",
    blurb: "A polite nudge to send when an application has gone quiet for a week.",
    pro: false,
    place: "application",
    unlocksAt: "APPLIED",
    anchor: "tool-follow-up",
  },
  "mock-interview": {
    id: "mock-interview",
    name: "Mock interview",
    brand: "Interview War Room",
    blurb: "An AI hiring manager asks you questions for this exact role, listens to your spoken answers and scores them.",
    pro: true,
    place: "application",
    unlocksAt: "INTERVIEW",
    anchor: "tool-mock-interview",
  },
  "practice-task": {
    id: "practice-task",
    name: "Practice task",
    brand: "Scenario / Technical Sandbox",
    blurb: "A realistic on-the-job scenario or coding challenge for this role, then honest feedback on your answer.",
    pro: true,
    place: "application",
    unlocksAt: "ASSESSMENT",
    anchor: "tool-practice-task",
  },
  "counter-offer": {
    id: "counter-offer",
    name: "Counter-offer email",
    brand: "Salary Negotiator",
    blurb: "Enter the offer and your target; get a professional counter-offer email built on your real leverage.",
    pro: false,
    place: "application",
    unlocksAt: "OFFER",
    anchor: "tool-counter-offer",
  },
  "accept-offer": {
    id: "accept-offer",
    name: "Add the new job to your profile",
    blurb: "Once you've said yes, one click moves your profile, fit scores and pathway to your new role.",
    pro: false,
    place: "application",
    unlocksAt: "OFFER",
    anchor: "tool-accept-offer",
  },
};

/** Stages in the order an application moves through them. */
const STAGE_ORDER: ApplicationStatus[] = [
  "SAVED",
  "PREPARING",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
];

/** Position of a stage in the forward pipeline; closed stages (rejected, withdrawn) return -1. */
export function stageRank(status: ApplicationStatus): number {
  return STAGE_ORDER.indexOf(status);
}

/**
 * Whether a tool is open for an application. Offer tools only make sense
 * while the offer is live; practice tools stay open once the stage has been
 * reached (a rejection later doesn't undo the interview you had, and you
 * may be interviewing elsewhere for the same kind of role).
 */
export function toolAvailableFor(
  tool: Tool,
  application: { status: ApplicationStatus; reachedAssessmentAt: Date | null; reachedInterviewAt: Date | null },
): boolean {
  const { status } = application;
  switch (tool.unlocksAt) {
    case undefined:
      return true;
    case "OFFER":
      return status === "OFFER";
    case "APPLIED":
      return ["APPLIED", "ASSESSMENT", "INTERVIEW", "FINAL_INTERVIEW"].includes(status);
    case "ASSESSMENT":
      return Boolean(application.reachedAssessmentAt || application.reachedInterviewAt) || stageRank(status) >= stageRank("ASSESSMENT");
    case "INTERVIEW":
      return Boolean(application.reachedInterviewAt) || stageRank(status) >= stageRank("INTERVIEW");
    default:
      return stageRank(status) >= stageRank(tool.unlocksAt);
  }
}

/** Tools that live on the application page, in the order they're used. */
export const APPLICATION_TOOL_IDS: ToolId[] = [
  "resume-bullets",
  "application-strategy",
  "follow-up",
  "mock-interview",
  "practice-task",
  "counter-offer",
  "accept-offer",
];

export function applicationToolHref(applicationId: string, id: ToolId): string {
  const anchor = TOOLS[id].anchor;
  return `/applications/${applicationId}${anchor ? `#${anchor}` : ""}`;
}

export const STAGE_NAME: Partial<Record<ApplicationStatus, string>> = {
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  FINAL_INTERVIEW: "Final interview",
  OFFER: "Offer",
};
