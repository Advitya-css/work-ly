"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  if (dismissed) return null;

  const handleResend = async () => {
    setPending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } catch {
      // silently fail
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      <Mail className="size-4 shrink-0 text-warning" />
      <p className="flex-1 text-foreground">
        {sent
          ? "Verification email sent! Check your inbox."
          : "Please verify your email address. Check your inbox for a verification link."}
      </p>
      {!sent && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={handleResend}
          disabled={pending}
        >
          {pending ? "Sending…" : "Resend email"}
        </Button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
