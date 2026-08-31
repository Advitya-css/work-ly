"use client";

import { useTransition } from "react";
import { Bookmark, Loader2, ClipboardCheck, Send, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleOpportunitySavedAction, setOpportunityStatusAction } from "@/lib/opportunities/actions";
import type { OpportunityStatus } from "@/lib/db/types";

export function OpportunityStatusControls({ id, isSaved, status }: { id: string; isSaved: boolean; status: OpportunityStatus }) {
  const [isPending, startTransition] = useTransition();

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
          onClick={() => startTransition(() => setOpportunityStatusAction(id, "PREPARING"))}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
          Mark as preparing
        </Button>
      )}

      {status !== "APPLIED" && (
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => setOpportunityStatusAction(id, "APPLIED"))}
        >
          {isPending ? <Loader2 className="animate-spin" /> : <Send />}
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
          onClick={() => startTransition(() => setOpportunityStatusAction(id, "DISCOVERED"))}
        >
          <RotateCcw />
          Reset status
        </Button>
      )}
    </div>
  );
}
