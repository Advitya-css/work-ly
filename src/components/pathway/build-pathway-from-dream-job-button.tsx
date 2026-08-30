"use client";

import { useState, useTransition } from "react";
import { Loader2, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generatePathwayFromDreamJobAction } from "@/lib/pathway/actions";

/**
 * Builds a pathway scoped to this specific dream job and lands directly on
 * /career-path - a real navigation, not the old anchor-scroll-to-a-static-
 * list-on-this-same-page behavior. See generatePathwayFromDreamJobAction
 * for why this needed its own action rather than reusing
 * generatePathwayAction (which intentionally stays on /career-path).
 */
export function BuildPathwayFromDreamJobButton({ dreamJobId, isPro = false }: { dreamJobId: string; isPro?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generatePathwayFromDreamJobAction(dreamJobId);
      // A successful call never returns - it redirects to /career-path.
      // Reaching here at all means it didn't.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      
      {!isPro ? (
        <UpgradeModal title="Unlock The Dream Pathway" description="Get a personalized 30-day action plan with direct Coursera links and AI coaching.">
          <Button type="button" variant="default" size="sm" className="shrink-0 bg-primary/90 hover:bg-primary gap-2 ">
            <Lock className="size-4" />
            Build Pathway (Pro)
          </Button>
        </UpgradeModal>
      ) : (
        <Button type="button" size="sm" className="shrink-0" onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Route />}
        {pending ? "Building your pathway…" : "Build My Dream Pathway"}
      </Button>
      )}
  
      {error && (
        <Alert variant="destructive" className="max-w-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
