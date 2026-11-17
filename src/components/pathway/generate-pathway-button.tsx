"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generatePathwayAction } from "@/lib/pathway/actions";

export function GeneratePathwayButton({ hasExisting, isPro = false }: { hasExisting: boolean; isPro?: boolean }) {
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
    <div className="flex flex-col items-start sm:items-end gap-2 text-left sm:text-right">
      
      {!isPro ? (
        <UpgradeModal title="Your plan to get there" description="A week-by-week plan from where you are now to the role you want, with a named course or project for each gap.">
          <Button type="button" variant="default" size="sm" className="shrink-0 bg-primary/90 hover:bg-primary gap-2 ">
            <Lock className="size-4" />
            Build my plan (Pro)
          </Button>
        </UpgradeModal>
      ) : (
        <Button
        type="button"
        variant={hasExisting ? "outline" : "default"}
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? <WorklyLoader className="animate-spin" /> : hasExisting ? <RefreshCw /> : <Route />}
        {pending ? "Working out your plan…" : hasExisting ? "Build it again" : "Build my plan"}
      </Button>
      )}
  
      {hasExisting && (
        <p className="text-xs text-muted-foreground max-w-[320px]">
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
