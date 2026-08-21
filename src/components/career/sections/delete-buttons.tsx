"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import {
  deleteEducationAction,
  deleteExperienceAction,
  deleteProjectAction,
  deleteSkillAction,
  deleteAchievementAction,
  deleteCertificationAction,
} from "@/lib/career/entity-actions";

export function DeleteEducationButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={label}
      entityName="education entry"
      onConfirm={() => deleteEducationAction(id)}
    />
  );
}

export function DeleteExperienceButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={label}
      entityName="experience entry"
      onConfirm={() => deleteExperienceAction(id)}
    />
  );
}

export function DeleteProjectButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton itemLabel={label} entityName="project" onConfirm={() => deleteProjectAction(id)} />
  );
}

export function DeleteSkillButton({ id, label }: { id: string; label: string }) {
  return <ConfirmDeleteButton itemLabel={label} entityName="skill" onConfirm={() => deleteSkillAction(id)} />;
}

export function DeleteAchievementButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={label}
      entityName="achievement"
      onConfirm={() => deleteAchievementAction(id)}
    />
  );
}

export function DeleteCertificationButton({ id, label }: { id: string; label: string }) {
  return (
    <ConfirmDeleteButton
      itemLabel={label}
      entityName="certification"
      onConfirm={() => deleteCertificationAction(id)}
    />
  );
}
