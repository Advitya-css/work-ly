"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { recheckOpportunityFitAction } from "@/lib/opportunities/actions";

/**
 * Shown on a job checked before the user last edited their profile, or
 * before the matching improved: one click re-reads it against the profile.
 */
export function RecheckFit({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
      <span>Your profile or Work-ly&apos;s matching has changed since this check.</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await recheckOpportunityFitAction(opportunityId);
            if ("error" in result) setError(result.error);
            else router.refresh();
          })
        }
        className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? "Re-checking…" : "Re-check now"}
      </button>
      {error && (
        <span role="alert" className="text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
