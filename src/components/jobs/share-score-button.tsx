"use client";

import { Share, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ShareScoreButtonProps {
  score: number;
  roleTitle: string;
  companyName?: string | null;
  className?: string;
}

export function ShareScoreButton({ score, roleTitle, companyName, className }: ShareScoreButtonProps) {
  const [copied, setCopied] = useState(false);

  const text = `I just scored a ${Math.round(score)}% Candidate Fit for the ${roleTitle} role${companyName ? ` at ${companyName}` : ""}!\n\nSee how your resume matches up at workly.in`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Work-ly Fit Score",
          text: text,
          url: "https://workly.in",
        });
        return;
      } catch (err) {
        // Fallback to copy if share gets aborted/fails
      }
    }

    // Fallback
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className={className}>
      {copied ? <Check className="mr-2 size-4 text-success" /> : <Share className="mr-2 size-4" />}
      {copied ? "Copied!" : "Share Match"}
    </Button>
  );
}
