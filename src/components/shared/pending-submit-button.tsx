"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * A submit button for a server-action form that shows a spinner and locks
 * itself while the form is being sent, so a slow step never looks broken
 * and a second click can't restart it.
 */
export function PendingSubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingLabel ?? "One moment…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
