"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { trackDiscoveredJobAction } from "@/lib/discovery/actions";

/** "Analyze & track" for one of the first matches, then a link straight to its analysis. */
export function TrackMatchButton({ discoveredJobId }: { discoveredJobId: string }) {
  const [pending, startTransition] = useTransition();
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (opportunityId) {
    return (
      <Button asChild size="sm" className="w-full sm:w-auto">
        <Link href={`/opportunities/${opportunityId}`}>
          Open the full analysis
          <ArrowRight />
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        size="sm"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await trackDiscoveredJobAction(discoveredJobId);
            if (result.opportunityId) setOpportunityId(result.opportunityId);
            else setError(result.error ?? "Couldn't analyze this one. Try it from Discover.");
          })
        }
      >
        {pending ? <WorklyLoader className="size-4 animate-spin" /> : <Plus />}
        {pending ? "Analyzing..." : "Analyze & track"}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
