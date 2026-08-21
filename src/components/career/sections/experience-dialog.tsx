"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import { createExperienceAction, updateExperienceAction, type EntityActionState } from "@/lib/career/entity-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Experience } from "@/lib/db/types";

const EMPTY: EntityActionState = {};

export function ExperienceDialog({ experience }: { experience?: Experience }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EntityActionState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const [isCurrent, setIsCurrent] = useState(experience?.isCurrent ?? false);
  const isEdit = !!experience;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateExperienceAction(experience.id, EMPTY, formData)
        : await createExperienceAction(EMPTY, formData);
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
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit experience">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline">
            <Plus />
            Add experience
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit experience" : "Add experience"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Saving marks this entry as confirmed by you." : "Add a role you've held."}
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-title">Title</Label>
              <Input id="exp-title" name="title" required defaultValue={experience?.title ?? ""} placeholder="Product Designer" />
              {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-company">Company</Label>
              <Input id="exp-company" name="company" required defaultValue={experience?.company ?? ""} placeholder="Acme Inc." />
              {state.fieldErrors?.company && <p className="text-xs text-destructive">{state.fieldErrors.company}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-location">Location</Label>
            <Input id="exp-location" name="location" defaultValue={experience?.location ?? ""} placeholder="Remote" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-start">Start date</Label>
              <Input
                id="exp-start"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(experience?.startDate ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-end">End date</Label>
              <Input
                id="exp-end"
                name="endDate"
                type="date"
                disabled={isCurrent}
                defaultValue={toDateInputValue(experience?.endDate ?? null)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="exp-current"
              name="isCurrent"
              checked={isCurrent}
              onCheckedChange={(checked) => setIsCurrent(checked === true)}
            />
            <Label htmlFor="exp-current" className="font-normal">
              I currently work here
            </Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exp-description">Description</Label>
            <Textarea
              id="exp-description"
              name="description"
              rows={4}
              defaultValue={experience?.description ?? ""}
              placeholder="What you did, and the impact you had."
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
