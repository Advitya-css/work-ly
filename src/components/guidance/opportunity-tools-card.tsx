import Link from "next/link";
import { FileText, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TailorApplicationButton } from "@/components/opportunities/tailor-application-button";
import { InsiderAccessButton } from "@/components/opportunities/insider-access-button";
import { InterviewIntelButton } from "@/components/opportunities/interview-intel-button";
import { TOOLS, type ToolId } from "@/lib/guidance/tools";
import type { PreviewData } from "@/lib/guidance/preview-data";

/**
 * The AI tools for one job, each with a line saying what it's for.
 *
 * These used to be four unexplained buttons squeezed into the page header
 * next to Save and Delete ("Hiring Manager Bypass", "Interview Intel"),
 * which is where nobody looks for help writing a cover letter. Here each
 * tool says what it does, in the order you'd use them.
 */
export function OpportunityToolsCard({
  opportunityId,
  isPro,
  preview,
}: {
  opportunityId: string;
  isPro: boolean;
  preview?: PreviewData;
}) {
  const tiles: { id: ToolId; action: React.ReactNode }[] = [
    {
      id: "tailored-resume",
      action: (
        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link href={`/opportunities/${opportunityId}/resume`}>
            {isPro ? <FileText className="size-4" /> : <Lock className="size-4" />}
            {isPro ? "Open it" : "See what you'd get"}
          </Link>
        </Button>
      ),
    },
    {
      id: "cover-letter",
      action: (
        <TailorApplicationButton opportunityId={opportunityId} isPro={isPro} preview={preview} label="Write it" lockedLabel="See what you'd get" />
      ),
    },
    {
      id: "hiring-manager",
      action: (
        <InsiderAccessButton opportunityId={opportunityId} isPro={isPro} preview={preview} label="Write the message" lockedLabel="See what you'd get" />
      ),
    },
    {
      id: "interview-questions",
      action: (
        <InterviewIntelButton opportunityId={opportunityId} isPro={isPro} preview={preview} label="Show the questions" lockedLabel="See what you'd get" />
      ),
    },
  ];

  return (
    <section aria-labelledby="job-tools-title" className="@container rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="job-tools-title" className="text-base font-semibold text-foreground">
          Tools for this job
        </h2>
        {!isPro && <p className="text-xs text-muted-foreground">Pro tools. Open one to preview it with your own details.</p>}
      </div>
      <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {tiles.map(({ id, action }) => {
          const tool = TOOLS[id];
          return (
            <li key={id} className="flex flex-col justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{tool.blurb}</p>
              </div>
              <div className="[&_a]:w-full [&_button]:h-auto [&_button]:min-h-9 [&_button]:w-full [&_button]:whitespace-normal">{action}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
