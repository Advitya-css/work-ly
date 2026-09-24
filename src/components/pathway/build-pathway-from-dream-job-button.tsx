"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition } from "react";
import { Loader2, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generatePathwayFromDreamJobAction } from "@/lib/pathway/actions";
import { ProPreview } from "@/components/guidance/pro-preview";

/**
 * Builds a pathway scoped to this specific dream job and lands directly on
 * /career-path - a real navigation, not the old anchor-scroll-to-a-static-
 * list-on-this-same-page behavior. See generatePathwayFromDreamJobAction
 * for why this needed its own action rather than reusing
 * generatePathwayAction (which intentionally stays on /career-path).
 */
export function BuildPathwayFromDreamJobButton({
  dreamJobId,
  isPro = false,
  gaps = [],
}: {
  dreamJobId: string;
  isPro?: boolean;
  /** The analysis's top gaps, shown in the locked preview. */
  gaps?: string[];
}) {
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
        <UpgradeModal
          title="Unlock your step-by-step plan"
          description="Turn the gaps to this role into ordered steps and a 30/60/90-day action plan you can tick off."
          preview={
            gaps.length > 0 ? (
              <ProPreview
                heading="What your plan would cover"
                facts={[{ label: "The gaps it would close, in order", items: gaps.slice(0, 5) }]}
                outputLabel="Your steps and 30/60/90-day actions"
                lines={3}
              />
            ) : undefined
          }
        >
          <Button type="button" variant="default" size="sm" className="shrink-0 gap-2">
            <Lock className="size-4" />
            Build my plan (Pro)
          </Button>
        </UpgradeModal>
      ) : (
        <Button type="button" size="sm" className="shrink-0" onClick={handleClick} disabled={pending}>
        {pending ? <WorklyLoader className="animate-spin" /> : <Route />}
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
