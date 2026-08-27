"use client";

import { useState } from "react";
import { Share2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareProfileButton({ profileId }: { profileId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = `${window.location.origin}/p/${profileId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 shrink-0">
      {copied ? <CheckCircle2 className="size-4 text-primary" /> : <Share2 className="size-4" />}
      {copied ? "Link Copied!" : "Share Profile"}
    </Button>
  );
}
