"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";

import {
  createCertificationAction,
  updateCertificationAction,
  type EntityActionState,
} from "@/lib/career/entity-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Certification } from "@/lib/db/types";

const EMPTY: EntityActionState = {};

export function CertificationDialog({ certification }: { certification?: Certification }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<EntityActionState>(EMPTY);
  const [pending, startTransition] = useTransition();
  const isEdit = !!certification;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEdit
        ? await updateCertificationAction(certification.id, EMPTY, formData)
        : await createCertificationAction(EMPTY, formData);
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
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Edit certification">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline">
            <Plus />
            Add certification
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit certification" : "Add certification"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Saving marks this entry as confirmed by you." : "Add a certification or license."}
            </DialogDescription>
          </DialogHeader>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-name">Name</Label>
            <Input id="cert-name" name="name" required defaultValue={certification?.name ?? ""} placeholder="AWS Certified Solutions Architect" />
            {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-issuer">Issuer</Label>
            <Input id="cert-issuer" name="issuer" defaultValue={certification?.issuer ?? ""} placeholder="Amazon Web Services" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-issue">Issue date</Label>
              <Input
                id="cert-issue"
                name="issueDate"
                type="date"
                defaultValue={toDateInputValue(certification?.issueDate ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cert-expiry">Expiry date</Label>
              <Input
                id="cert-expiry"
                name="expiryDate"
                type="date"
                defaultValue={toDateInputValue(certification?.expiryDate ?? null)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cert-url">Credential URL</Label>
            <Input id="cert-url" name="credentialUrl" defaultValue={certification?.credentialUrl ?? ""} placeholder="https://…" />
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
