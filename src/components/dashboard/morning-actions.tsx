"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, Check, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { markMorningAppliedAction } from "@/lib/morning/actions";

/**
 * The three steps for one job on the morning list, in the order they're
 * done: read what was written, open the posting to send it, then say so.
 * "I've applied" puts it in the tracker without leaving Home.
 */
export function MorningActions({
  opportunityId,
  reviewHref,
  url,
  applied: appliedAtLoad,
}: {
  opportunityId: string;
  reviewHref: string;
  url: string | null;
  applied: boolean;
}) {
  const [applied, setApplied] = useState(appliedAtLoad);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (applied) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-success">
          <Check className="size-4" aria-hidden />
          Applied
        </span>
        <Link href="/applications" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          In your tracker
        </Link>
      </p>
    );
  }

  function markApplied() {
    setError(null);
    startTransition(async () => {
      const result = await markMorningAppliedAction(opportunityId).catch(() => ({ error: "Couldn't add it to your tracker. Try again." }));
      if ("error" in result) setError(result.error);
      else setApplied(true);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link href={reviewHref}>
            Review it
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
        {url && (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open the posting
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={markApplied} disabled={pending}>
          <Check className="size-4" aria-hidden />
          {pending ? "Adding…" : "I've applied"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
