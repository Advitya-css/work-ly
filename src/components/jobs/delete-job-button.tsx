"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteJobAction } from "@/lib/jobs/actions";

export function DeleteJobButton({ id, label }: { id: string; label: string }) {
  return <ConfirmDeleteButton itemLabel={label} entityName="job analysis" onConfirm={() => deleteJobAction(id)} />;
}
