"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AiProgress } from "@/components/shared/ai-progress";
import { GraderImportCard } from "@/components/onboarding/grader-import-card";
import { importFromGraderAction } from "@/lib/onboarding/grader-import";
import { clearGraderDraft, draftJobLabel, readGraderDraft, type GraderDraft } from "@/lib/grader-draft";

/** A check this recent means they signed up straight from it. */
const FRESH_MS = 6 * 60 * 60 * 1000;

/**
 * THE CHECK COMES WITH YOU.
 *
 * Someone who checked a job on the homepage and then signed up shouldn't
 * land on "What brings you here?" and paste everything again. If their
 * check is fresh, the welcome step skips the questions: their resume
 * becomes their profile, the job opens in full, and they land on it, with
 * nothing to click. An older check is offered as a card instead; no check
 * at all shows the normal welcome.
 */
export function WelcomeGate({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<GraderDraft | null | undefined>(undefined);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    // Browser storage is only readable after mount.
    const d = readGraderDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(d);
    setFresh(Boolean(d && Date.now() - d.savedAt < FRESH_MS));
  }, []);

  if (draft && fresh) {
    return (
      <AutoImport
        draft={draft}
        onCancel={() => {
          clearGraderDraft();
          setDraft(null);
        }}
      />
    );
  }
  return (
    <>
      {draft && <GraderImportCard />}
      {children}
    </>
  );
}

function AutoImport({ draft, onCancel }: { draft: GraderDraft; onCancel: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const job = draftJobLabel(draft.jobText);

  // Once per attempt, even when React runs effects twice in development:
  // each run is a real import (an AI read and a tracked job).
  const ran = useRef(-1);
  useEffect(() => {
    if (ran.current === attempt) return;
    ran.current = attempt;
    setError(null);
    // No "cancel" while it runs: the import can't be stopped once it has
    // started, so offering one would leave a profile and a job behind a
    // person who thought they'd said no. A failure offers the way out.
    importFromGraderAction({ resumeText: draft.resumeText, jobText: draft.jobText })
      .then((res) => {
        if (res.opportunityId) {
          clearGraderDraft();
          router.push(`/opportunities/${res.opportunityId}`);
        } else {
          setError(res.error ?? "That didn't work. Please try again.");
        }
      })
      .catch(() => setError("Couldn't reach Work-ly just now. Check your connection and try again."));
  }, [attempt, draft, router]);

  return (
    <section aria-live="polite" className="flex w-full max-w-lg flex-col items-center gap-5 feature-panel p-6 text-center sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground">Picking up where you left off</h1>
        <p className="text-sm text-muted-foreground">
          Your check for <span className="font-medium text-foreground">{job}</span> is coming with you. No need to paste anything again.
        </p>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-3">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
            <Button variant="ghost" onClick={onCancel}>
              Set up another way
            </Button>
          </div>
        </div>
      ) : (
        <>
          <AiProgress
            stepSeconds={8}
            steps={[
              "Turning your resume into your profile",
              "Checking this job again, in full detail",
              "Writing down how to close each gap",
              "Opening your report",
            ]}
            note="About a minute. You'll land on the job when it's ready."
          />
        </>
      )}
    </section>
  );
}
