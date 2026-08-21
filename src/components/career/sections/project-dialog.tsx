"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import { createProjectAction, updateProjectAction, type EntityActionState } from "@/lib/career/entity-actions";
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
import type { Project } from "@/lib/db/types";

const EMPTY: EntityActionState = {};

export function ProjectDialog({ project }: { project?: Project }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EntityActionState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const isEdit = !!project;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateProjectAction(project.id, EMPTY, formData)
        : await createProjectAction(EMPTY, formData);
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
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit project">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline">
            <Plus />
            Add project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit project" : "Add project"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Saving marks this entry as confirmed by you." : "Add a project worth showing."}
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-name">Project name</Label>
            <Input id="proj-name" name="name" required defaultValue={project?.name ?? ""} placeholder="Personal finance tracker" />
            {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-role">Your role</Label>
              <Input id="proj-role" name="role" defaultValue={project?.role ?? ""} placeholder="Solo builder" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-url">URL</Label>
              <Input id="proj-url" name="url" defaultValue={project?.url ?? ""} placeholder="https://…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-start">Start date</Label>
              <Input id="proj-start" name="startDate" type="date" defaultValue={toDateInputValue(project?.startDate ?? null)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-end">End date</Label>
              <Input id="proj-end" name="endDate" type="date" defaultValue={toDateInputValue(project?.endDate ?? null)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-description">Description</Label>
            <Textarea
              id="proj-description"
              name="description"
              rows={4}
              defaultValue={project?.description ?? ""}
              placeholder="What it does and what you built."
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
