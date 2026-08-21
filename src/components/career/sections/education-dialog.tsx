"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import { createEducationAction, updateEducationAction, type EntityActionState } from "@/lib/career/entity-actions";
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
import type { Education } from "@/lib/db/types";

const EMPTY: EntityActionState = {};

export function EducationDialog({ education }: { education?: Education }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EntityActionState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const isEdit = !!education;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateEducationAction(education.id, EMPTY, formData)
        : await createEducationAction(EMPTY, formData);
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
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit education">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline">
            <Plus />
            Add education
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit education" : "Add education"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Saving marks this entry as confirmed by you."
                : "Add a school, degree, or program to your profile."}
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edu-institution">Institution</Label>
            <Input
              id="edu-institution"
              name="institution"
              required
              defaultValue={education?.institution ?? ""}
              placeholder="Stanford University"
            />
            {state.fieldErrors?.institution && (
              <p className="text-xs text-destructive">{state.fieldErrors.institution}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-degree">Degree</Label>
              <Input id="edu-degree" name="degree" defaultValue={education?.degree ?? ""} placeholder="B.S." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-field">Field of study</Label>
              <Input
                id="edu-field"
                name="fieldOfStudy"
                defaultValue={education?.fieldOfStudy ?? ""}
                placeholder="Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-start">Start date</Label>
              <Input
                id="edu-start"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(education?.startDate ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-end">End date</Label>
              <Input
                id="edu-end"
                name="endDate"
                type="date"
                defaultValue={toDateInputValue(education?.endDate ?? null)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edu-description">Description</Label>
            <Textarea
              id="edu-description"
              name="description"
              rows={3}
              defaultValue={education?.description ?? ""}
              placeholder="Relevant coursework, honors, activities…"
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
