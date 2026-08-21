"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteApplicationAction } from "@/lib/applications/actions";

export function DeleteApplicationButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={label}
      entityName="application"
      onConfirm={() => deleteApplicationAction(id)}
    />
  );
}
