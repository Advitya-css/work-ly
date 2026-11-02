"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { shareVerdictAction } from "@/lib/share/actions";
import { cn } from "@/lib/utils";

/**
 * "Share this verdict": a card with the job, the verdict and which
 * requirements are met, never the resume. On a phone it opens the share
 * sheet with the picture attached (Instagram story, WhatsApp...); anywhere
 * it offers the link and the image. Pass `token` when the server already
 * signed the card (the homepage check), or `opportunityId` to sign one of
 * your saved jobs on demand.
 */
export function ShareVerdictButton({
  token: givenToken = null,
  opportunityId,
  invites = false,
  label = "Share",
  variant = "outline",
  size = "sm",
  className,
}: {
  token?: string | null;
  opportunityId?: string;
  /** Signed in: the link carries their invite, so mention the two weeks. */
  invites?: boolean;
  label?: string;
  variant?: "outline" | "ghost" | "secondary" | "default";
  size?: "sm" | "default";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(givenToken);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const origin = typeof window !== "undefined" ? window.location.origin : "https://work-ly.in";
  const url = token ? `${origin}/v/${token}` : "";
  const image = token ? `/v/${token}/card.png` : "";

  function openDialog() {
    setError(null);
    setOpen(true);
    if (token || !opportunityId) return;
    start(async () => {
      const res = await shareVerdictAction(opportunityId);
      if (res.token) setToken(res.token);
      else setError(res.error ?? "Couldn't make the card. Try again.");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it yourself.");
    }
  }

  async function nativeShare() {
    const text = "Work-ly checked this job against my resume and gave me a straight answer.";
    try {
      const blob = await fetch(image).then((r) => (r.ok ? r.blob() : null));
      const file = blob ? new File([blob], "work-ly-verdict.png", { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` });
      } else {
        await navigator.share({ title: "My Work-ly verdict", text, url });
      }
    } catch {
      // Cancelled, or the browser refused: the link and image are still right here.
    }
  }

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={openDialog} className={cn("gap-1.5", className)}>
        <Share2 className="size-3.5" aria-hidden />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-lg">
          <div className="flex flex-col gap-1">
            <DialogTitle>Share this verdict</DialogTitle>
            <DialogDescription>
              The card shows the job, the verdict and which requirements you meet. Your resume stays private.
            </DialogDescription>
          </div>

          <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-lg border border-border bg-secondary">
            {token ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Your verdict card" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                {pending ? <WorklyLoader className="size-6 animate-spin text-primary" /> : null}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {token && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  aria-label="Link to your verdict"
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground"
                />
                <Button type="button" variant="secondary" size="sm" onClick={copy} className="w-24 shrink-0 gap-1.5">
                  {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {canNativeShare && (
                  <Button type="button" size="sm" onClick={nativeShare} className="gap-1.5">
                    <Share2 className="size-3.5" />
                    Share…
                  </Button>
                )}
                <Button asChild type="button" variant="outline" size="sm" className="gap-1.5">
                  <a href={image} download="work-ly-verdict.png">
                    <Download className="size-3.5" />
                    Save image
                  </a>
                </Button>
              </div>
              {invites && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The link is also your invite: if someone signs up through it and buys Pro, you both get two extra weeks.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
