"use client";

import { useState, useTransition } from "react";
import {
  Check,
  SkipForward,
  RotateCcw,
  Pencil,
  StickyNote,
  Loader2,
  FolderKanban,
  Unlock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setStepStatusAction, updateStepAction } from "@/lib/pathway/actions";
import { GAP_TYPE_LABEL } from "@/lib/jobs/labels";
import { ITEM_STATUS_LABEL, ITEM_STATUS_VARIANT } from "@/lib/pathway/labels";
import type { PathwayStep } from "@/lib/db/types";

export function PathwayStepCard({ step, isLast }: { step: PathwayStep; isLast: boolean }) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);
  const [note, setNote] = useState(step.note ?? "");

  const resolved = step.status !== "PENDING";
  const project = step.projectRecommendation;

  return (
    <div className="relative flex gap-4">
      {/* Rail + node */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
            step.status === "COMPLETED" && "border-success bg-success/10 text-success",
            step.status === "SKIPPED" && "border-border bg-muted text-muted-foreground",
            step.status === "PENDING" && "border-primary/40 bg-background text-foreground",
          )}
        >
          {step.status === "COMPLETED" ? <Check className="size-4" /> : step.order}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" aria-hidden />}
      </div>

      {/* Body */}
      <div className={cn("flex-1 pb-8", resolved && "opacity-70")}>
        <div className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium text-foreground",
                step.status === "SKIPPED" && "line-through",
              )}
            >
              {step.title}
            </p>
            {step.status !== "PENDING" && (
              <Badge variant={ITEM_STATUS_VARIANT[step.status]}>{ITEM_STATUS_LABEL[step.status]}</Badge>
            )}
            {step.gapType && <Badge variant="outline">{GAP_TYPE_LABEL[step.gapType] ?? step.gapType}</Badge>}
          </div>

          <p className="text-sm text-muted-foreground">{step.description}</p>

          {/* Unlocked opportunities: only rendered when the count came from
              real Opportunity rows, so this claim is always checkable. */}
          {step.unlockedOpportunityCount > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-primary">
              <Unlock className="mt-0.5 size-3.5 shrink-0" />
              Completing this step could make you relevant to {step.unlockedOpportunityCount} additional
              opportunit{step.unlockedOpportunityCount === 1 ? "y" : "ies"} you&apos;re already tracking.
            </p>
          )}

          {project && (
            <div className="mt-1 flex flex-col gap-1 rounded-lg bg-secondary/50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <FolderKanban className="size-3.5" />
                Suggested project
              </p>
              <p className="text-sm font-medium text-foreground">{project.project}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{project.estimatedTime}</Badge>
                {project.relevantTargetJobs.length > 0 && (
                  <Badge variant="secondary">
                    Relevant to {project.relevantTargetJobs.length} of your roles
                  </Badge>
                )}
              </div>
            </div>
          )}

          {step.note && (
            <p className="flex items-start gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <StickyNote className="mt-0.5 size-3.5 shrink-0" />
              {step.note}
            </p>
          )}

          {/* Controls */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {step.status !== "COMPLETED" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => startTransition(() => setStepStatusAction(step.id, "COMPLETED"))}
              >
                {pending ? <Loader2 className="animate-spin" /> : <Check />}
                Complete
              </Button>
            )}
            {step.status !== "SKIPPED" && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() => startTransition(() => setStepStatusAction(step.id, "SKIPPED"))}
              >
                <SkipForward />
                Skip
              </Button>
            )}
            {step.status !== "PENDING" && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() => startTransition(() => setStepStatusAction(step.id, "PENDING"))}
              >
                <RotateCcw />
                Reopen
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setEditOpen(true)}
            >
              <Pencil />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setNoteOpen(true)}
            >
              <StickyNote />
              {step.note ? "Edit note" : "Add note"}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit step</DialogTitle>
            <DialogDescription>
              Make this step your own. Workly generated it, but you know your situation better.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`title-${step.id}`}>Title</Label>
              <Input id={`title-${step.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`desc-${step.id}`}>Description</Label>
              <Textarea
                id={`desc-${step.id}`}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !title.trim()}
              onClick={() =>
                startTransition(async () => {
                  await updateStepAction(step.id, { title: title.trim(), description: description.trim() });
                  setEditOpen(false);
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your note</DialogTitle>
            <DialogDescription>
              Anything you want to remember about this step. Only you see this.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Started the course on the 14th. Halfway through module 3." />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateStepAction(step.id, { note: note.trim() || null });
                  setNoteOpen(false);
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
