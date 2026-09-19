"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SharePathwayButton({ pathwayId }: { pathwayId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${pathwayId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <Button variant="outline" onClick={handleShare} className="gap-2">
      {copied ? <Check className="size-4 text-green-500" /> : <Share2 className="size-4" />}
      {copied ? "Copied Link" : "Share Pathway"}
    </Button>
  );
}
