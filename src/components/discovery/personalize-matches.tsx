"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { screenTopMatchesAction } from "@/lib/discovery/actions";

const MAX_ROUNDS = 3;

function alreadyTried(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markTried(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked: at worst it runs once more on the next visit.
  }
}

/**
 * Reads the user's top matches in full, right after they appear.
 *
 * Discovery saves listings with a quick rules-engine score; the grounded AI
 * read (strengths quoted from their own resume, the one gap that matters)
 * runs here, in its own requests, a batch at a time - see
 * lib/discovery/deep-screen.ts. Runs by itself once per new batch of
 * results (keyed on `runKey`), and can be started by hand.
 */
export function PersonalizeMatches({
  pending,
  runKey,
  auto = true,
  className,
}: {
  /** Top matches not yet read in full, computed on the server. */
  pending: number;
  /** Changes whenever there's a new set of results (e.g. the latest run id). */
  runKey: string;
  auto?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "stopped">("idle");
  const [read, setRead] = useState(0);
  const started = useRef(false);

  const run = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    markTried(`workly_screened_${runKey}`);
    setState("running");
    let total = 0;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const result = await screenTopMatchesAction().catch(() => null);
      if (!result || result.error || !result.available) break;
      total += result.screened;
      setRead(total);
      router.refresh();
      if (result.screened === 0 || result.remaining === 0) break;
    }
    setState(total > 0 ? "done" : "stopped");
  }, [router, runKey]);

  useEffect(() => {
    if (auto && pending > 0 && !alreadyTried(`workly_screened_${runKey}`)) void run();
  }, [auto, pending, runKey, run]);

  if (state === "running") {
    return (
      <div role="status" className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
        <WorklyLoader className="size-4 shrink-0 animate-spin text-primary" />
        <span className="text-foreground">
          Reading your top matches in full against your resume
          {read > 0 ? ` - ${read} done so far` : ""}. Scores and reasons update as each one finishes.
        </span>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div role="status" className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
        <CheckCircle2 className="size-4 shrink-0 text-success" />
        <span className="text-muted-foreground">
          {read} top match{read === 1 ? "" : "es"} read in full: each now says, in your own resume&apos;s words, why it fits and what&apos;s missing.
        </span>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm ${className ?? ""}`}>
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="text-muted-foreground">
          {pending} of your top matches only have a quick score so far.
        </span>
        <button
          type="button"
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => {
            started.current = false;
            void run();
          }}
        >
          Read them in full against my resume
        </button>
      </div>
    );
  }

  return null;
}
