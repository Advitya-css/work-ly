"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { acceptTransferableSkillAction, deleteSkillAction } from "@/lib/career/entity-actions";

/** "Yes, that's me" / "Not really" controls for a suggested transferable skill - never auto-applied. */
export function TransferableSkillActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => acceptTransferableSkillAction(id))}
      >
        <Check className="size-3.5" />
        Yes, that&apos;s me
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        disabled={pending}
        onClick={() => startTransition(() => deleteSkillAction(id))}
      >
        <X className="size-3.5" />
        Dismiss
      </Button>
    </div>
  );
}
