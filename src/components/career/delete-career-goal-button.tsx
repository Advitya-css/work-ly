"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteCareerGoalAction } from "@/lib/career/actions";

export function DeleteCareerGoalButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton itemLabel={label} entityName="career goal" onConfirm={() => deleteCareerGoalAction(id)} />
  );
}
