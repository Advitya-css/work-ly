"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteDreamJobAction } from "@/lib/dream-job/actions";

export function DeleteDreamJobButton({ id, label }: { id: string; label: string }) {
  return <ConfirmDeleteButton itemLabel={label} entityName="dream job analysis" onConfirm={() => deleteDreamJobAction(id)} />;
}
