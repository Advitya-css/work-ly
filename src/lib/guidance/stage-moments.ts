import type { ApplicationStatus } from "@/lib/db/types";
import { TOOLS, applicationToolHref, stageRank, type ToolId } from "./tools";

/**
 * What to say when an application moves stage.
 *
 * Tools on the application page appear as the application reaches the
 * stage they're useful at - the mock interview when there's an interview,
 * the counter-offer email when there's an offer. That keeps the page calm,
 * but it also meant nobody knew those tools existed until they stumbled on
 * them. The moment someone drags a card to "Interview" is exactly when
 * they care, so that's when Work-ly says so.
 *
 * Pure and client-safe: the pop-up host renders whatever this returns.
 */

export interface StageChange {
  applicationId: string;
  opportunityId: string | null;
  roleTitle: string;
  company: string | null;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
}

export interface MomentAction {
  toolId: ToolId;
  label: string;
  blurb: string;
  href: string;
  pro: boolean;
}

export interface StageMoment {
  tone: "celebrate" | "encourage" | "console";
  title: string;
  body: string;
  actions: MomentAction[];
}

function at(company: string | null): string {
  return company ? ` at ${company}` : "";
}

function action(change: StageChange, id: ToolId, label?: string): MomentAction | null {
  const tool = TOOLS[id];
  let href: string;
  if (tool.place === "application") {
    href = applicationToolHref(change.applicationId, id);
  } else if (tool.place === "opportunity") {
    // Opportunity tools need the analysed job behind the application; a
    // manually logged application has none, so the tool can't run for it.
    if (!change.opportunityId) return null;
    href = id === "tailored-resume" ? `/opportunities/${change.opportunityId}/resume` : `/opportunities/${change.opportunityId}`;
  } else if (id === "discover") {
    href = "/discover";
  } else {
    return null;
  }
  return { toolId: id, label: label ?? tool.name, blurb: tool.blurb, href, pro: tool.pro };
}

function actions(change: StageChange, ...ids: (ToolId | [ToolId, string])[]): MomentAction[] {
  return ids
    .map((entry) => (Array.isArray(entry) ? action(change, entry[0], entry[1]) : action(change, entry)))
    .filter((a): a is MomentAction => a !== null);
}

export function stageMomentFor(change: StageChange): StageMoment | null {
  const { from, to, company } = change;
  if (from === to) return null;

  const movingForward = from == null || stageRank(from) < 0 || stageRank(to) > stageRank(from);

  if (to === "REJECTED") {
    // Only when an open application closes - not when tidying up an old one
    // that was already withdrawn.
    if (from === "WITHDRAWN") return null;
    return {
      tone: "console",
      title: company ? `${company} said no this time` : "This one didn't work out",
      body:
        "It stings, but it isn't wasted: the interview and offer rates on your Applications page show which kinds of roles respond to you. The best next step is a fresh batch of matches while you're in the flow.",
      actions: actions(change, ["discover", "Find new matches"]),
    };
  }

  if (!movingForward) return null;

  switch (to) {
    case "PREPARING":
      return {
        tone: "encourage",
        title: `Getting ready to apply${at(company)}`,
        body: "Sending the same resume everywhere is the most common reason good candidates get filtered out. Tailor it for this one first:",
        actions: actions(change, "tailored-resume", "cover-letter", "resume-bullets"),
      };
    case "APPLIED":
      return {
        tone: "encourage",
        title: `Application sent${at(company)}`,
        body:
          "Nice. While you wait, a short note to the hiring manager is one of the few things that lifts a resume out of the pile. If it goes quiet for a week, a follow-up email will appear on the application.",
        actions: actions(change, "hiring-manager", ["interview-questions", "Start prepping: likely interview questions"]),
      };
    case "ASSESSMENT":
      return {
        tone: "celebrate",
        title: `You're through to the assessment${at(company)}`,
        body: "Most applications stop before this point. Rehearse the kind of task they'll set before you do it for real:",
        actions: actions(change, "practice-task", "interview-questions"),
      };
    case "INTERVIEW":
      return {
        tone: "celebrate",
        title: `You got an interview${at(company)}!`,
        body: "Well done - most applications never get this far. Here's how to walk in prepared:",
        actions: actions(change, "mock-interview", "interview-questions", "practice-task"),
      };
    case "FINAL_INTERVIEW":
      return {
        tone: "celebrate",
        title: `Final round${at(company)}`,
        body: "You're close. Run one more mock interview and rehearse the questions most likely to decide it:",
        actions: actions(change, "mock-interview", "interview-questions", "practice-task"),
      };
    case "OFFER":
      return {
        tone: "celebrate",
        title: `You got an offer${at(company)}!`,
        body:
          "Congratulations. Before you say yes: most employers expect a counter-offer, and a polite, specific one rarely costs you the job.",
        actions: actions(change, "counter-offer", ["accept-offer", "Accepted? Add the job to your profile"]),
      };
    default:
      return null;
  }
}
