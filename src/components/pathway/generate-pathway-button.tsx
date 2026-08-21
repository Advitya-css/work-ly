"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generatePathwayAction } from "@/lib/pathway/actions";

export function GeneratePathwayButton({ hasExisting }: { hasExisting: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generatePathwayAction();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={hasExisting ? "outline" : "default"}
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : hasExisting ? <RefreshCw /> : <Route />}
        {pending ? "Building your pathway…" : hasExisting ? "Regenerate pathway" : "Build my pathway"}
      </Button>
      {hasExisting && (
        <p className="text-xs text-muted-foreground">
          Regenerating starts a fresh plan from your current profile. Your previous pathway is archived,
          not deleted.
        </p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
