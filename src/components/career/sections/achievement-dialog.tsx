"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import { createAchievementAction, updateAchievementAction, type EntityActionState } from "@/lib/career/entity-actions";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toDateInputValue } from "@/lib/format";
import type { Achievement } from "@/lib/db/types";

const EMPTY: EntityActionState = {};

export function AchievementDialog({ achievement }: { achievement?: Achievement }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EntityActionState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const isEdit = !!achievement;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateAchievementAction(achievement.id, EMPTY, formData)
        : await createAchievementAction(EMPTY, formData);
      if (result.success) {
        setState(EMPTY);
        setOpen(false);
      } else {
        setState(result);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setState(EMPTY);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit achievement">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline">
            <Plus />
            Add achievement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit achievement" : "Add achievement"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Saving marks this entry as confirmed by you." : "Add an award, publication, or notable result."}
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-title">Title</Label>
            <Input id="ach-title" name="title" required defaultValue={achievement?.title ?? ""} placeholder="Best Paper Award" />
            {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-date">Date</Label>
            <Input id="ach-date" name="date" type="date" defaultValue={toDateInputValue(achievement?.date ?? null)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-description">Description</Label>
            <Textarea
              id="ach-description"
              name="description"
              rows={3}
              defaultValue={achievement?.description ?? ""}
              placeholder="What it was and why it mattered."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
