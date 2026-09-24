"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, ClipboardCheck, Send, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleOpportunitySavedAction, setOpportunityStatusAction } from "@/lib/opportunities/actions";
import type { OpportunityStatus } from "@/lib/db/types";
import { announceStageChange } from "@/lib/guidance/stage-events";

export function OpportunityStatusControls({
  id,
  isSaved,
  status,
  roleTitle,
  company,
}: {
  id: string;
  isSaved: boolean;
  status: OpportunityStatus;
  roleTitle?: string | null;
  company?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  // After "Mark as applied" the page used to change silently. Now it says
  // so and links to the tracker, where outcomes and follow-ups live.
  const [tracked, setTracked] = useState<{ status: OpportunityStatus; applicationId?: string } | null>(null);

  function setStatus(next: OpportunityStatus) {
    startTransition(async () => {
      const result = await setOpportunityStatusAction(id, next);
      setTracked(next === "APPLIED" || next === "PREPARING" ? { status: next, applicationId: result?.applicationId } : null);
      if ((next === "APPLIED" || next === "PREPARING") && result?.applicationId) {
        announceStageChange({
          applicationId: result.applicationId,
          opportunityId: id,
          roleTitle: roleTitle ?? "this role",
          company: company ?? null,
          from: status === "DISCOVERED" ? null : status,
          to: next,
        });
      }
    });
  }

  function toggleSaved() {
    startTransition(() => toggleOpportunitySavedAction(id, !isSaved));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleSaved}
        disabled={isPending}
        className={cn(isSaved && "border-primary text-primary")}
      >
        <Bookmark className={cn("size-3.5", isSaved && "fill-current")} />
        {isSaved ? "Saved" : "Save"}
      </Button>

      {status !== "PREPARING" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("PREPARING")}
        >
          {isPending ? <WorklyLoader className="animate-spin" /> : <ClipboardCheck />}
          Mark as preparing
        </Button>
      )}

      {status !== "APPLIED" && (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("APPLIED")}
        >
          {isPending ? <WorklyLoader className="animate-spin" /> : <Send />}
          Mark as applied
        </Button>
      )}

      {status !== "DISCOVERED" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="text-muted-foreground"
          onClick={() => setStatus("DISCOVERED")}
        >
          <RotateCcw />
          Reset status
        </Button>
      )}
      {tracked && (
        <p role="status" className="flex w-full flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          {tracked.status === "APPLIED" ? "Marked as applied and added to your tracker." : "Added to your tracker as preparing."}
          <Link
            href={tracked.applicationId ? `/applications/${tracked.applicationId}` : "/applications"}
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            {tracked.status === "APPLIED" ? "Log the CV version you sent" : "Open in Applications"}
            <ArrowRight className="size-3.5" />
          </Link>
        </p>
      )}
    </div>
  );
}
