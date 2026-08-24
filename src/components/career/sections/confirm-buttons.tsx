"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmEducationAction,
  confirmExperienceAction,
  confirmProjectAction,
  confirmAchievementAction,
  confirmCertificationAction,
} from "@/lib/career/entity-actions";

interface ConfirmButtonProps {
  id: string;
  type: "education" | "experience" | "project" | "achievement" | "certification";
}

export function ConfirmEntityButton({ id, type }: ConfirmButtonProps) {
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      switch (type) {
        case "education": await confirmEducationAction(id); break;
        case "experience": await confirmExperienceAction(id); break;
        case "project": await confirmProjectAction(id); break;
        case "achievement": await confirmAchievementAction(id); break;
        case "certification": await confirmCertificationAction(id); break;
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0 text-success hover:bg-success/10 hover:text-success"
      onClick={handleConfirm}
      disabled={pending}
      title="Confirm this entry is correct"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      <span className="ml-2">Confirm</span>
    </Button>
  );
}
