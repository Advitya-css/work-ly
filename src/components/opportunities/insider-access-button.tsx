"use client";

import { useState } from "react";
import { Mail, Copy, CheckCircle2, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOutreachEmailAction } from "@/lib/opportunities/pro-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";
import { AiProgress } from "@/components/shared/ai-progress";

export function InsiderAccessButton({
  opportunityId,
  isPro = false,
  preview,
  label,
  lockedLabel,
}: {
  opportunityId: string;
  isPro?: boolean;
  preview?: PreviewData;
  /** Button text override, e.g. a shorter label inside a tool tile. */
  label?: string;
  lockedLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateOutreachEmailAction(opportunityId);
      if ("error" in res) setError(res.error);
      else setData(res.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {!isPro ? (
        <UpgradeModal
          title="Unlock hiring manager messages"
          description="A short, specific note to the person who'll actually decide, so you're not just one more resume in the pile."
          preview={
            preview && (
              <ProPreview
                facts={[{ label: "It would open with what you bring", items: preview.strengths }]}
                outputLabel="Your message, ready to send on email or LinkedIn"
                lines={3}
              />
            )
          }
        >
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <Lock className="size-4" />
            {lockedLabel ?? "Message the hiring manager (Pro)"}
          </Button>
        </UpgradeModal>
      ) : (
        <Button 
          variant="outline"
          onClick={() => {
            setOpen(true);
            if (!data && !loading && !error) handleGenerate();
          }}
          className="w-full sm:w-auto gap-2"
        >
          <UserPlus className="size-4" />
          {label ?? "Message the hiring manager"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Message the hiring manager
            </DialogTitle>
            <DialogDescription>
              A short, specific note to the hiring manager, built on what you actually bring.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-10">
                <AiProgress
                  steps={["Reading the job", "Finding your strongest proof for it", "Writing a short, specific note", "Checking every claim against your profile"]}
                  stepSeconds={7}
                  note="Usually 20-40 seconds."
                />
              </div>
            )}
            
            {error && !loading && (
              <div className="py-6 text-center text-destructive">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={handleGenerate}>
                  Try Again
                </Button>
              </div>
            )}

            {data && !loading && (
              <div className="flex flex-col gap-4">
                <div className="text-sm text-muted-foreground border-l-4 border-primary pl-4 py-2">
                  <span className="font-semibold text-foreground">Pro Tip:</span> Search LinkedIn for the person who leads this team at the company (the manager one level above this role, e.g. "Head of Analytics" for an analyst role). Read it once, make it sound like you, then send it with a short connection request.
                </div>
                
                <div className="bg-muted/50 rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap border border-border mt-2">
                  {data.email}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {data && !loading && (
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied!" : "Copy Email"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
