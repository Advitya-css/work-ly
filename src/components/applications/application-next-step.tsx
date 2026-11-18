import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/db/types";

/**
 * THE TOP OF AN APPLICATION: where it stands and the one thing worth doing
 * now. Replaces a five-column grid listing every tool for every stage,
 * which read as a menu rather than advice.
 */

const STAGES: { key: string; label: string; statuses: ApplicationStatus[] }[] = [
  { key: "prep", label: "Preparing", statuses: ["SAVED", "PREPARING"] },
  { key: "applied", label: "Applied", statuses: ["APPLIED"] },
  { key: "assessment", label: "Assessment", statuses: ["ASSESSMENT"] },
  { key: "interview", label: "Interview", statuses: ["INTERVIEW", "FINAL_INTERVIEW"] },
  { key: "offer", label: "Offer", statuses: ["OFFER"] },
];

type Action = { label: string; href: string } | { label: string; upgrade: string };
interface Step {
  eyebrow: string;
  title: string;
  body: string;
  primary?: Action;
  secondary?: { label: string; href: string };
}

const DAY = 24 * 60 * 60 * 1000;
function shortDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function applicationStep(input: {
  id: string;
  status: ApplicationStatus;
  opportunityId: string | null;
  dateApplied: Date | null;
  followUpShown: boolean;
  lastMilestone: Date | null;
  isPro: boolean;
}): Step | null {
  const { id, status, opportunityId, isPro } = input;
  switch (status) {
    case "SAVED":
    case "PREPARING":
      return {
        eyebrow: "Next step",
        title: "Apply with a resume written for this job",
        body: "Your most relevant experience first, in this posting's language. Nothing added that isn't on your profile.",
        primary: opportunityId
          ? isPro
            ? { label: "Open my tailored resume", href: `/opportunities/${opportunityId}/resume?build=1` }
            : { label: "Tailor my resume for this job", upgrade: "Tailor your resume for this job" }
          : { label: "Tailor my bullets", href: "#tool-resume-bullets" },
        secondary: { label: "Your angle + cover letter", href: "#tool-application-strategy" },
      };
    case "APPLIED": {
      if (input.followUpShown) {
        return {
          eyebrow: "It's been a week",
          title: "Send a short follow-up",
          body: "One polite note a week after applying is normal, and it puts your name back in front of them.",
          primary: { label: "Write the follow-up", href: "#tool-follow-up" },
        };
      }
      const opens = input.lastMilestone ? new Date(new Date(input.lastMilestone).getTime() + 7 * DAY) : null;
      return {
        eyebrow: input.dateApplied ? `Applied ${shortDate(input.dateApplied)}` : "Applied",
        title: "While you wait, get ready for the call",
        body: `Most replies come within two weeks.${opens ? ` If there's none by ${shortDate(opens)}, a follow-up note opens here.` : ""}`,
        primary: opportunityId ? { label: "See likely interview questions", href: `/opportunities/${opportunityId}` } : undefined,
      };
    }
    case "ASSESSMENT":
      return {
        eyebrow: "Assessment stage",
        title: "Practise a task like theirs first",
        body: "A realistic task for this role, graded, so the real one isn't the first time you've tried it.",
        primary: { label: "Try a practice task", href: "#tool-practice-task" },
      };
    case "INTERVIEW":
    case "FINAL_INTERVIEW":
      return {
        eyebrow: status === "FINAL_INTERVIEW" ? "Final interview" : "Interview stage",
        title: "Practise this interview out loud",
        body: "The questions this role is likely to get. Answer by voice or typing, and get a score and a fix for every answer.",
        primary: isPro
          ? { label: "Start a mock interview", href: `/applications/${id}/interview` }
          : { label: "Start a mock interview", upgrade: "Practise this interview" },
        secondary: opportunityId ? { label: "Likely questions", href: `/opportunities/${opportunityId}` } : undefined,
      };
    case "OFFER":
      return {
        eyebrow: "You have an offer",
        title: "Negotiate before you say yes",
        body: "Most offers have room. A short, polite counter based on the role and the market is expected.",
        primary: { label: "Write my counter-offer", href: "#tool-counter-offer" },
        secondary: { label: "Accept the offer", href: "#tool-accept-offer" },
      };
    default:
      return {
        eyebrow: status === "WITHDRAWN" ? "Withdrawn" : "Closed",
        title: "On to the next one",
        body: "Everything you learned here stays on this page. Roles like this one are still being posted.",
        primary: { label: "Find similar roles", href: "/discover" },
      };
  }
}

export function ApplicationNextStep({
  step,
  status,
  milestones,
}: {
  step: Step | null;
  status: ApplicationStatus;
  milestones: { applied: boolean; assessment: boolean; interview: boolean; offer: boolean };
}) {
  const current = STAGES.findIndex((s) => s.statuses.includes(status));
  const done: Record<string, boolean> = {
    prep: milestones.applied,
    applied: milestones.applied && current > 1,
    assessment: milestones.assessment && current > 2,
    interview: milestones.interview && current > 3,
    offer: false,
  };

  return (
    <section className="overflow-hidden feature-panel">
      <ol className="flex items-center gap-2 overflow-x-auto border-b border-border px-5 py-3 text-xs sm:px-6" aria-label="Stages">
        {STAGES.map((stage, i) => {
          const isCurrent = i === current;
          return (
            <li key={stage.key} className="flex shrink-0 items-center gap-2">
              {i > 0 && <span className="h-px w-4 bg-border sm:w-8" aria-hidden />}
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
                  isCurrent ? "bg-primary-solid text-primary-solid-foreground" : done[stage.key] ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {done[stage.key] && !isCurrent && <Check className="size-3 text-success" aria-hidden />}
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {step && (
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-xl flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{step.eyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">{step.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {step.primary &&
              ("upgrade" in step.primary ? (
                <UpgradeModal title={step.primary.upgrade} defaultPlan="quarterly">
                  <Button size="lg" className="gap-2">
                    {step.primary.label}
                    <ArrowRight className="size-4" />
                  </Button>
                </UpgradeModal>
              ) : (
                <Button asChild size="lg" className="gap-2">
                  <Link href={step.primary.href}>
                    {step.primary.label}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ))}
            {step.secondary && (
              <Link href={step.secondary.href} className="text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {step.secondary.label}
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
