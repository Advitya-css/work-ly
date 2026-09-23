"use client";

import { useState } from "react";
import { Mail, Loader2, Copy, CheckCircle2, UserPlus, Lock } from "lucide-react";
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

export function InsiderAccessButton({ opportunityId, isPro = false }: { opportunityId: string; isPro?: boolean }) {
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
      setData(res);
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
        <UpgradeModal title="Unlock Hiring Manager Bypass" description="Generate a highly strategic cold email to bypass the resume pile and reach the hiring manager directly.">
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <Lock className="size-4" />
            Bypass ATS (Pro)
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
          Hiring Manager Bypass
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Hiring Manager Outreach
            </DialogTitle>
            <DialogDescription>
              A strategic cold email designed to bypass the ATS and secure an introductory chat.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p>Analyzing profile and crafting strategic hook...</p>
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
                  <span className="font-semibold text-foreground">Pro Tip:</span> Use LinkedIn or Apollo.io to find the likely hiring manager (e.g., "Director of Engineering" or "Head of Product") at this company. Send this message exactly as written to secure a 15-minute intro call.
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
