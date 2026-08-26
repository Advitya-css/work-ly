"use client";

import { useState, useTransition } from "react";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Check, SkipForward, RotateCcw, Pencil, StickyNote, Loader2, Clock, Zap } from "lucide-react";

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
import { setActionStatusAction, updateActionAction } from "@/lib/pathway/actions";
import { DIFFICULTY_VARIANT, ITEM_STATUS_LABEL, ITEM_STATUS_VARIANT } from "@/lib/pathway/labels";
import type { PathwayAction } from "@/lib/db/types";

export function ActionCard({ action }: { action: PathwayAction }) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description);
  const [note, setNote] = useState(action.note ?? "");

  const resolved = action.status !== "PENDING";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border px-4 py-3.5",
        resolved && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {action.priority === 1 && action.status === "PENDING" && (
          <Badge variant="destructive">
            <Zap className="size-3" />
            Priority
          </Badge>
        )}
        <p className={cn("text-sm font-medium text-foreground", action.status === "SKIPPED" && "line-through")}>
          {action.title}
        </p>
        {action.status !== "PENDING" && (
          <Badge variant={ITEM_STATUS_VARIANT[action.status]}>{ITEM_STATUS_LABEL[action.status]}</Badge>
        )}
      </div>

      <div className="text-sm text-muted-foreground"><MarkdownRenderer content={action.description} /></div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">
          <Clock className="size-3" />
          {action.estimatedTime}
        </Badge>
        <Badge variant={DIFFICULTY_VARIANT[action.difficulty] ?? "outline"}>{action.difficulty}</Badge>
        {action.relatedSkill && <Badge variant="secondary">{action.relatedSkill}</Badge>}
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Expected impact:</span> {action.expectedImpact}
      </p>

      {action.relatedTargetJobs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Related roles:</span>{" "}
          {action.relatedTargetJobs.join(", ")}
        </p>
      )}

      {action.note && (
        <p className="flex items-start gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <StickyNote className="mt-0.5 size-3.5 shrink-0" />
          {action.note}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {action.status !== "COMPLETED" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => setActionStatusAction(action.id, "COMPLETED"))}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            Complete
          </Button>
        )}
        {action.status !== "SKIPPED" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() => startTransition(() => setActionStatusAction(action.id, "SKIPPED"))}
          >
            <SkipForward />
            Skip
          </Button>
        )}
        {action.status !== "PENDING" && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() => startTransition(() => setActionStatusAction(action.id, "PENDING"))}
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
          {action.note ? "Edit note" : "Add note"}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit action</DialogTitle>
            <DialogDescription>Adjust this to match how you actually plan to do it.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`atitle-${action.id}`}>Title</Label>
              <Input id={`atitle-${action.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`adesc-${action.id}`}>Description</Label>
              <Textarea
                id={`adesc-${action.id}`}
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
                  await updateActionAction(action.id, {
                    title: title.trim(),
                    description: description.trim(),
                  });
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

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your note</DialogTitle>
            <DialogDescription>Only you see this.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateActionAction(action.id, { note: note.trim() || null });
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
