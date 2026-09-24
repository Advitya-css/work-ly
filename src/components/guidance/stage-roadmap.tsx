import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { TOOLS, toolAvailableFor, type ToolId } from "@/lib/guidance/tools";
import type { ApplicationStatus } from "@/lib/db/types";

interface Column {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
  tools: ToolId[];
}

/** A real sequence - the stages an application moves through - so the order carries meaning. */
const COLUMNS: Column[] = [
  { key: "prep", label: "Before you apply", statuses: ["SAVED", "PREPARING"], tools: ["resume-bullets", "application-strategy"] },
  { key: "applied", label: "Applied", statuses: ["APPLIED"], tools: ["follow-up"] },
  { key: "assessment", label: "Assessment", statuses: ["ASSESSMENT"], tools: ["practice-task"] },
  { key: "interview", label: "Interview", statuses: ["INTERVIEW", "FINAL_INTERVIEW"], tools: ["mock-interview"] },
  { key: "offer", label: "Offer", statuses: ["OFFER"], tools: ["counter-offer", "accept-offer"] },
];

/**
 * Every tool this application will get, laid out by stage.
 *
 * The tool cards below only appear once an application reaches the stage
 * they're for, which keeps the page calm but hid them completely: nobody
 * knew there was a mock interview until they happened to move a card to
 * "Interview". This shows the whole road up front - what's open now, and
 * what opens next.
 */
export function StageRoadmap({
  application,
  isPro,
  followUpShown,
}: {
  application: {
    id: string;
    status: ApplicationStatus;
    opportunityId: string | null;
    reachedAssessmentAt: Date | null;
    reachedInterviewAt: Date | null;
  };
  isPro: boolean;
  /** The follow-up card only appears after a quiet week. */
  followUpShown: boolean;
}) {
  const currentIndex = COLUMNS.findIndex((c) => c.statuses.includes(application.status));

  return (
    <section aria-labelledby="stage-roadmap-title" className="@container rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="stage-roadmap-title" className="text-base font-semibold text-foreground">
          Your tools for this application
        </h2>
        <p className="text-xs text-muted-foreground">New tools open up as the application moves forward.</p>
      </div>

      <ol className="grid grid-cols-1 gap-3 @3xl:grid-cols-5 @3xl:gap-2">
        {COLUMNS.map((column, index) => {
          const isCurrent = index === currentIndex;
          const isPast = currentIndex >= 0 && index < currentIndex;
          return (
            <li
              key={column.key}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-3",
                isCurrent ? "border-primary/40 bg-primary/5" : "border-border bg-transparent",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
                  isCurrent ? "text-primary" : "text-muted-foreground",
                )}
              >
                {isPast && <Check className="size-3.5" aria-hidden />}
                {column.label}
                {isCurrent && <span className="sr-only">(current stage)</span>}
              </p>
              <ul className="flex flex-col gap-1.5">
                {column.tools.map((id) => {
                  const tool = TOOLS[id];
                  const open = toolAvailableFor(tool, application);
                  const waiting = id === "follow-up" && open && !followUpShown;
                  const proChip = tool.pro && !isPro && (
                    <span className="rounded-full border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Pro
                    </span>
                  );

                  if (open && !waiting && tool.anchor) {
                    return (
                      <li key={id}>
                        <Link
                          href={`#${tool.anchor}`}
                          className="group flex items-start justify-between gap-2 rounded-md text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                        >
                          <span className="flex flex-wrap items-center gap-1.5">
                            {tool.name}
                            {proChip}
                          </span>
                          <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={id} className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                      <span className="flex items-start gap-1.5">
                        <Lock className="mt-1 size-3 shrink-0" aria-hidden />
                        <span className="flex flex-wrap items-center gap-1.5">
                          {tool.name}
                          {proChip}
                        </span>
                      </span>
                      <span className="pl-[18px] text-xs">
                        {waiting ? "Appears after a week with no reply" : `Opens at ${column.label.toLowerCase()}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {application.opportunityId && (
        <p className="mt-3 text-xs text-muted-foreground">
          More for this job on its analysis page:{" "}
          <Link href={`/opportunities/${application.opportunityId}/resume`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {TOOLS["tailored-resume"].name}
          </Link>
          {" · "}
          <Link href={`/opportunities/${application.opportunityId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {TOOLS["hiring-manager"].name}
          </Link>
          {" · "}
          <Link href={`/opportunities/${application.opportunityId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {TOOLS["interview-questions"].name}
          </Link>
        </p>
      )}
    </section>
  );
}
