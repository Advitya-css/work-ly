"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiProgress } from "@/components/shared/ai-progress";
import { WorklyLoader } from "@/components/shared/workly-loader";
import type { ToolPhase } from "@/components/opportunities/use-saved-tool";

/** A copy button that says "Copied" for two seconds. */
export function CopyButton({ text, label, variant = "default", size = "default" }: { text: string; label: string; variant?: "default" | "outline" | "ghost"; size?: "default" | "sm" }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className="gap-2"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/**
 * The shell every job writing tool shares: a title, what it's for, the
 * output in the middle, and the actions at the bottom. "Write a new
 * version" asks first when it would replace edits.
 */
export function ToolDialog({
  open,
  onOpenChange,
  title,
  description,
  phase,
  error,
  steps,
  stepSeconds = 7,
  edited,
  status,
  onRegenerate,
  actions,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  phase: ToolPhase;
  error: string | null;
  steps: string[];
  stepSeconds?: number;
  edited: boolean;
  status?: string;
  onRegenerate: () => void;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const busy = phase === "checking" || phase === "generating";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setConfirming(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className={`${wide ? "sm:max-w-3xl" : "sm:max-w-2xl"} flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0`}>
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {phase === "checking" && (
            <div className="flex justify-center py-12">
              <WorklyLoader className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {phase === "generating" && (
            <div className="flex justify-center py-8">
              <AiProgress steps={steps} stepSeconds={stepSeconds} note="Usually 20-40 seconds. It's saved once it's written." />
            </div>
          )}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={onRegenerate}>
                Try again
              </Button>
            </div>
          )}
          {phase === "ready" && children}
        </div>

        {phase === "ready" && (
          <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-foreground">{edited ? "Replace your edited version?" : "Write a new version?"}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfirming(false);
                    onRegenerate();
                  }}
                >
                  Yes, rewrite
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled={busy} onClick={() => setConfirming(true)}>
                  <RefreshCw className="size-3.5" />
                  New version
                </Button>
                {status && <span className="text-xs text-muted-foreground" aria-live="polite">{status}</span>}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">{actions}</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
