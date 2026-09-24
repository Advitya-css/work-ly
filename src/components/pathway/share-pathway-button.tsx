"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProfilePublicAction } from "@/lib/career/actions";

/**
 * Sharing is an explicit opt-in: clicking this turns on the same
 * revocable "public" switch as Share Profile, then copies the link. The
 * public page refuses to render a pathway whose owner hasn't opted in.
 */
export function SharePathwayButton({ pathwayId }: { pathwayId: string }) {
  const [state, setState] = useState<"idle" | "working" | "copied" | "error">("idle");

  const handleShare = async () => {
    setState("working");
    const result = await setProfilePublicAction(true).catch(() => ({ error: "failed" }));
    if (result && "error" in result && result.error) {
      setState("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${pathwayId}`);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" onClick={handleShare} disabled={state === "working"} className="gap-2">
        {state === "copied" ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
        {state === "copied" ? "Link copied" : "Share Pathway"}
      </Button>
      <span className="text-xs text-muted-foreground">
        {state === "error" ? "Couldn't create a share link. Try again." : "Anyone with the link can view this plan. Turn sharing off from your profile."}
      </span>
    </div>
  );
}
