"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { runDiscoveryAction, setTargetRoleAction } from "@/lib/discovery/actions";

/**
 * The role Discover is searching for, in plain sight and editable in one
 * step. Saving it runs a fresh search straight away. Built for people
 * changing careers, whose feed used to be their old job title.
 */
export function TargetRoleCard({
  targetRole,
  changingCareer,
}: {
  targetRole: string | null;
  changingCareer: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!targetRole);
  const [value, setValue] = useState(targetRole ?? "");
  const [stage, setStage] = useState<"idle" | "saving" | "searching">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStage("saving");
    startTransition(async () => {
      const saved = await setTargetRoleAction(value);
      if (saved.error) {
        setError(saved.error);
        setStage("idle");
        return;
      }
      setStage("searching");
      const run = await runDiscoveryAction();
      if (run.error) setError(run.error);
      setStage("idle");
      setEditing(false);
      router.refresh();
    });
  }

  const busy = stage !== "idle";

  if (!editing && targetRole) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Compass className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Searching for <span className="font-medium text-foreground">{targetRole}</span> roles
            {changingCareer ? ", as a career change: jobs like the ones you've done before are left out." : "."}
          </span>
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} className="self-start sm:self-auto">
          <Pencil />
          Change
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">What role do you want next?</p>
        <p className="text-sm text-muted-foreground">
          Changing careers? Type the role you&apos;re moving into, and Discover searches for that instead of your past job
          titles.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. UX Designer"
          aria-label="The role you want next"
          maxLength={100}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || value.trim().length < 2} className="shrink-0">
          {busy ? <WorklyLoader className="size-4 animate-spin" /> : null}
          {stage === "saving" ? "Saving…" : stage === "searching" ? "Finding jobs… about a minute" : "Find these jobs"}
        </Button>
        {targetRole && !busy && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="shrink-0">
            Cancel
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
