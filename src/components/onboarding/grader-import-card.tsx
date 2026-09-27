"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { importFromGraderAction } from "@/lib/onboarding/grader-import";
import { clearGraderDraft, draftJobLabel, readGraderDraft, type GraderDraft } from "@/lib/grader-draft";
import { cn } from "@/lib/utils";

/**
 * "Pick up where you left off": shown to someone who used the free grader
 * before signing up (or signing in). Renders nothing otherwise.
 */
export function GraderImportCard({ className, hasProfile = false }: { className?: string; hasProfile?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GraderDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(readGraderDraft());
  }, []);

  if (!draft) return null;

  function importDraft() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await importFromGraderAction({ resumeText: draft.resumeText, jobText: draft.jobText });
      if (result.opportunityId) {
        clearGraderDraft();
        router.push(`/opportunities/${result.opportunityId}`);
      } else {
        setError(result.error ?? "That didn't work. Please try again.");
      }
    });
  }

  function dismiss() {
    clearGraderDraft();
    setDraft(null);
  }

  return (
    <section
      aria-labelledby="grader-import-title"
      className={cn("w-full rounded-xl border border-primary/30 bg-primary/5 p-5 text-left", className)}
    >
      <h2 id="grader-import-title" className="font-semibold text-foreground">
        Pick up where you left off
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        You checked your resume against <span className="font-medium text-foreground">{draftJobLabel(draft.jobText)}</span>.
        {hasProfile
          ? "Work-ly can open the full report for that job in your account, including how to close each gap."
          : "Work-ly can build your profile from that resume and open the full report for that job, including how to close each gap."}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button onClick={importDraft} disabled={pending} className="gap-1.5">
          {pending ? <WorklyLoader className="size-4 animate-spin" /> : null}
          {pending ? "Building your report... about a minute" : "Use my resume and this job"}
          {!pending && <ArrowRight className="size-4" />}
        </Button>
        <Button variant="ghost" onClick={dismiss} disabled={pending}>
          Start fresh instead
        </Button>
      </div>
    </section>
  );
}
