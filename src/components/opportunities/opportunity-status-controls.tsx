"use client";

import { useTransition } from "react";
import { Bookmark, Loader2, ClipboardCheck, Send, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleOpportunitySavedAction, setOpportunityStatusAction } from "@/lib/opportunities/actions";
import type { Opportunity } from "@/lib/db/types";

export function OpportunityStatusControls({ opportunity }: { opportunity: Opportunity }) {
  const [isPending, startTransition] = useTransition();

  function toggleSaved() {
    startTransition(() => toggleOpportunitySavedAction(opportunity.id, !opportunity.isSaved));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleSaved}
        disabled={isPending}
        className={cn(opportunity.isSaved && "border-primary text-primary")}
      >
        <Bookmark className={cn("size-3.5", opportunity.isSaved && "fill-current")} />
        {opportunity.isSaved ? "Saved" : "Save"}
      </Button>

      {opportunity.status !== "PREPARING" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => setOpportunityStatusAction(opportunity.id, "PREPARING"))}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
          Mark as preparing
        </Button>
      )}

      {opportunity.status !== "APPLIED" && (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => setOpportunityStatusAction(opportunity.id, "APPLIED"))}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Send />}
          Mark as applied
        </Button>
      )}

      {opportunity.status !== "DISCOVERED" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="text-muted-foreground"
          onClick={() => startTransition(() => setOpportunityStatusAction(opportunity.id, "DISCOVERED"))}
        >
          <RotateCcw />
          Reset status
        </Button>
      )}
    </div>
  );
}
