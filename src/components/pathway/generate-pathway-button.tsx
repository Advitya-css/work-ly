"use client";

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
    <div className="flex flex-col items-start gap-2">
      
      {!isPro ? (
        <UpgradeModal title="Unlock The Dream Pathway" description="Get a personalized 30-day action plan with direct Coursera links and AI coaching.">
          <Button type="button" variant="default" size="sm" className="shrink-0 bg-primary/90 hover:bg-primary gap-2 ">
            <Lock className="size-4" />
            Build Pathway (Pro)
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
        {pending ? <Loader2 className="animate-spin" /> : hasExisting ? <RefreshCw /> : <Route />}
        {pending ? "Building your pathway…" : hasExisting ? "Regenerate Action Plan" : "Build my pathway"}
      </Button>
      )}
  
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
