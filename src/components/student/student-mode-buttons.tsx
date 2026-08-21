"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconStudent } from "@/components/icons";
import { enterStudentModeAction, exitStudentModeAction } from "@/lib/student/actions";

/**
 * The way in and the way out.
 *
 * Both are deliberately explicit. Student mode replaces the whole
 * navigation, and a mode change that happens without the user pressing
 * something is disorienting, so neither is ever triggered automatically by,
 * say, spotting a university on someone's CV.
 *
 * Both also render an error if the switch fails. The first version assumed
 * it could not, so when the database was missing the column the action
 * threw, and Next replaced the page with a crash screen quoting raw
 * Postgres at the user. A failed mode switch should leave you on the page
 * you were on, with a sentence telling you what to do.
 */

export function EnterStudentModeButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enter() {
    setError(null);
    start(async () => {
      const result = await enterStudentModeAction();
      // A success redirects, so anything returned here is a failure.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className={className}>
      <Button type="button" disabled={pending} onClick={enter}>
        <IconStudent />
        {pending ? "Switching…" : "Student? Click here"}
      </Button>
      {error && <p className="mt-2 max-w-sm text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ExitStudentModeButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function exit() {
    setError(null);
    start(async () => {
      const result = await exitStudentModeAction();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        size="sm"
        className="w-full justify-start text-sidebar-foreground/75"
        disabled={pending}
        onClick={exit}
      >
        <LogOut className="size-4" />
        {pending ? "Leaving…" : "Exit student mode"}
      </Button>
      {error && <p className="mt-1.5 px-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
