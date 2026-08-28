"use client";

import { useState, useTransition } from "react";
import { Share2, CheckCircle2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProfilePublicAction } from "@/lib/career/actions";

/**
 * Sharing is an explicit, revocable opt-in (see setProfilePublicAction /
 * setCareerProfilePublic) - the public /p/[id] page refuses to serve
 * anything until this button has actually turned isPublic on for this
 * profile. Before that fix, the page was reachable by anyone with the link
 * regardless of whether this button had ever been clicked.
 */
export function ShareProfileButton({
  profileId,
  initialIsPublic,
}: {
  profileId: string;
  initialIsPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleShare = () => {
    if (isPublic) {
      const url = `${window.location.origin}/p/${profileId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    startTransition(async () => {
      const result = await setProfilePublicAction(true);
      if (result.success) {
        setIsPublic(true);
        const url = `${window.location.origin}/p/${profileId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleUnshare = () => {
    startTransition(async () => {
      const result = await setProfilePublicAction(false);
      if (result.success) setIsPublic(false);
    });
  };

  if (isPublic) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
          {copied ? <CheckCircle2 className="size-4 text-primary" /> : <Share2 className="size-4" />}
          {copied ? "Link Copied!" : "Copy Public Link"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUnshare}
          disabled={pending}
          className="gap-2 text-muted-foreground"
          title="Stop anyone with the link from viewing this profile"
        >
          <EyeOff className="size-4" />
          Make Private
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} disabled={pending} className="gap-2 shrink-0">
      <Share2 className="size-4" />
      {pending ? "Enabling…" : "Share Profile"}
    </Button>
  );
}
