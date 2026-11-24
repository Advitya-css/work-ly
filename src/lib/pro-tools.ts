/**
 * EVERYTHING PRO DOES, IN ONE LIST.
 *
 * Pro has about fifteen tools and they live in three different places: the
 * application kit on a job, the cards on an application, and the pages
 * under My career. Most only appear once you are inside a particular job,
 * so nobody could see the whole set at once. This is the set, grouped by
 * the moment you would reach for each one, and it is what the My Pro page
 * draws.
 *
 * `access` says what a free account gets, and has to stay true to the
 * code that enforces it:
 *   - "pro":     Pro only (proApiGate, requireOwnedOpportunity, the pivot,
 *                pathway and LinkedIn actions)
 *   - "free":    everyone (the follow-up and counter-offer emails)
 *   - "limited": free with a cap, Pro without (one dream job; five
 *                searches a day against thirty)
 */

export type ProToolAccess = "pro" | "free" | "limited";

export type ProToolIcon =
  | "resume"
  | "letter"
  | "note"
  | "prep"
  | "mock"
  | "challenge"
  | "followup"
  | "counter"
  | "dream"
  | "plan"
  | "pivot"
  | "linkedin"
  | "nightly"
  | "search";

export interface ProTool {
  name: string;
  line: string;
  icon: ProToolIcon;
  access: ProToolAccess;
  /** What a free account gets, when access is "limited". */
  freeNote?: string;
  /** Where it lives. Per-job tools point at the job list; the page swaps in the latest job when there is one. */
  href: string;
  /** True for the four kit tools, which open on a specific job. */
  perJob?: boolean;
}

export interface ProToolGroup {
  id: "job" | "applied" | "career" | "nightly";
  title: string;
  line: string;
  tools: ProTool[];
}

export const PRO_TOOL_GROUPS: ProToolGroup[] = [
  {
    id: "job",
    title: "For a job you want",
    line: "The application kit, written for that one job from your real experience.",
    tools: [
      { name: "Resume for this job", line: "Your lines, in the posting's own words. Nothing invented.", icon: "resume", access: "pro", href: "/opportunities", perJob: true },
      { name: "Cover letter", line: "Their need first, then your proof.", icon: "letter", access: "pro", href: "/opportunities", perJob: true },
      { name: "Note to the hiring manager", line: "An email, a LinkedIn request and a follow-up.", icon: "note", access: "pro", href: "/opportunities", perJob: true },
      { name: "Interview prep", line: "The questions this job is likely to ask, answered from your history.", icon: "prep", access: "pro", href: "/opportunities", perJob: true },
    ],
  },
  {
    id: "applied",
    title: "Once you've applied",
    line: "On each application in your tracker.",
    tools: [
      { name: "Mock interview", line: "Answer out loud or in text. Every answer scored, with what to add.", icon: "mock", access: "pro", href: "/applications" },
      { name: "Practice challenge", line: "A realistic task for the role, then a review of what to fix.", icon: "challenge", access: "pro", href: "/applications" },
      { name: "Follow-up email", line: "A short note to send when a week has gone quiet.", icon: "followup", access: "free", href: "/applications" },
      { name: "Counter-offer email", line: "Put in the offer and your number; it writes the email.", icon: "counter", access: "free", href: "/applications" },
    ],
  },
  {
    id: "career",
    title: "For your career",
    line: "Where you want to be, and how to get there.",
    tools: [
      { name: "Dream job", line: "How close you are to the role you want, and what's missing.", icon: "dream", access: "limited", freeNote: "1 free", href: "/dream-job" },
      { name: "Action plan", line: "The gaps, as weekly steps you can finish.", icon: "plan", access: "pro", href: "/career-path" },
      { name: "Career change", line: "Your past work, in the new field's words.", icon: "pivot", access: "pro", href: "/career-pivot" },
      { name: "LinkedIn rewrite", line: "Headlines, an About section and the skills to pin.", icon: "linkedin", access: "pro", href: "/linkedin" },
    ],
  },
  {
    id: "nightly",
    title: "Done for you",
    line: "Work-ly keeps looking while you get on with your day.",
    tools: [
      { name: "Nightly check", line: "Every night it searches for your target role and reads the best new matches in full.", icon: "nightly", access: "pro", href: "/discover" },
      { name: "More searches", line: "Thirty searches a day instead of five, with more matches read in full.", icon: "search", access: "limited", freeNote: "5 a day", href: "/discover" },
    ],
  },
];

/** Every tool, flat. */
export const PRO_TOOLS: ProTool[] = PRO_TOOL_GROUPS.flatMap((g) => g.tools);

/**
 * The short label a free account sees on a tool, or null for a member
 * (who sees an Open link instead).
 */
export function accessLabel(tool: ProTool, isPro: boolean): string | null {
  if (isPro) return null;
  if (tool.access === "free") return "Free";
  if (tool.access === "limited") return tool.freeNote ?? "Limited";
  return "Pro";
}

/** Where a tool opens: a per-job tool goes straight to that job's kit when there is a job to open. */
export function toolHref(tool: ProTool, latestJobId: string | null): string {
  if (tool.perJob && latestJobId) {
    const tab = { resume: "resume", letter: "letter", note: "note", prep: "prep" }[tool.icon as "resume" | "letter" | "note" | "prep"];
    if (tab) return `/opportunities/${latestJobId}/${tab}`;
  }
  return tool.href;
}
