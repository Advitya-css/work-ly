"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, CheckCircle2, ClipboardCheck, MoreHorizontal, RotateCcw, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { setOpportunityStatusAction, toggleOpportunitySavedAction } from "@/lib/opportunities/actions";
import { deleteJobAction } from "@/lib/jobs/actions";
import { announceStageChange } from "@/lib/guidance/stage-events";
import type { OpportunityStatus } from "@/lib/db/types";

/**
 * Everything you can do to a job besides reading it, in one menu: save,
 * mark as preparing or applied, reset, delete. On a phone this used to be
 * four buttons stacked above the verdict; the verdict is what they opened
 * the page for.
 */
export function JobActionsMenu({
  id,
  jobId,
  isSaved,
  status,
  roleTitle,
  company,
}: {
  id: string;
  jobId: string;
  isSaved: boolean;
  status: OpportunityStatus;
  roleTitle?: string | null;
  company?: string | null;
}) {
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tracked, setTracked] = useState<{ status: OpportunityStatus; applicationId?: string } | null>(null);

  function setStatus(next: OpportunityStatus) {
    start(async () => {
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

  return (
    <div className="flex flex-col items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" aria-label="More actions for this job" disabled={pending}>
            {pending ? <WorklyLoader className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-4" />}
            <span className="hidden sm:inline">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">This job</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => start(() => toggleOpportunitySavedAction(id, !isSaved))}>
            <Bookmark className={isSaved ? "fill-current text-primary" : ""} />
            {isSaved ? "Remove from saved" : "Save for later"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status !== "PREPARING" && (
            <DropdownMenuItem onClick={() => setStatus("PREPARING")}>
              <ClipboardCheck />
              Mark as preparing
            </DropdownMenuItem>
          )}
          {status !== "APPLIED" && (
            <DropdownMenuItem onClick={() => setStatus("APPLIED")}>
              <Send />
              Mark as applied
            </DropdownMenuItem>
          )}
          {status !== "DISCOVERED" && (
            <DropdownMenuItem onClick={() => setStatus("DISCOVERED")}>
              <RotateCcw />
              Reset status
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete this job
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {tracked && (
        <p role="status" className="flex flex-wrap items-center justify-end gap-1.5 text-right text-sm text-muted-foreground">
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

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job?</DialogTitle>
            <DialogDescription>
              {roleTitle ?? "This job"} and everything Work-ly wrote for it will be removed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={() => start(() => deleteJobAction(jobId))}>
              {pending ? <WorklyLoader className="animate-spin" /> : <Trash2 />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
