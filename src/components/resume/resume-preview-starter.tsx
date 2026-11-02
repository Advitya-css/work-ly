"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AiProgress } from "@/components/shared/ai-progress";
import { buildResumePreviewAction } from "@/lib/resume/actions";

/**
 * "Write the top of it, free": builds this job's tailored resume for a free
 * account and reloads the page, which then shows the top of it in the clear
 * and the rest blurred (SavedResumeLocked). Starts by itself when the
 * person arrived from the job page's button (?preview=1).
 */
export function ResumePreviewStarter({ opportunityId, auto = false, jobLabel }: { opportunityId: string; auto?: boolean; jobLabel: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const started = useRef(false);

  function run() {
    setError(null);
    start(async () => {
      try {
        const res = await buildResumePreviewAction(opportunityId);
        if (res.ok) router.refresh();
        else setError(res.error ?? "Couldn't write it right now. Please try again.");
      } catch {
        setError("Couldn't reach Work-ly just now. Check your connection and try again.");
      }
    });
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    run();
    // Run once on arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (pending) {
    return (
      <section className="feature-panel flex min-h-[220px] flex-col items-center justify-center gap-4 p-6">
        <AiProgress
          stepSeconds={7}
          steps={[
            `Reading ${jobLabel} the way a recruiter would`,
            "Picking your lines that prove what it asks for",
            "Rewriting them in the posting's language",
            "Checking every number against your resume",
          ]}
          note="About 30-60 seconds. Nothing is added that isn't on your resume."
        />
      </section>
    );
  }

  return (
    <section className="feature-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex max-w-xl flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">See the top of your resume for this job, free</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Work-ly writes your summary and strongest lines for {jobLabel}, from your real experience. The free plan gets three a month.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button onClick={run} className="shrink-0 gap-2">
        Write the top of it, free
        <ArrowRight className="size-4" />
      </Button>
    </section>
  );
}
