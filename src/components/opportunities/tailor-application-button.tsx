"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState } from "react";
import { Sparkles, FileText, CheckCircle2, ChevronRight, X, Loader2, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTailoredApplicationAction } from "@/lib/opportunities/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { TailoredApplication } from "@/lib/ai/providers/tailor-ai";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { ProPreview } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";

export function TailorApplicationButton({
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
  const [data, setData] = useState<TailoredApplication | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateTailoredApplicationAction(opportunityId);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!data) return;
    const text = `=== COVER LETTER ===\n\n${data.coverLetter}\n\n=== RESUME BULLETS ===\n\n${data.resumeBullets.map(b => "• " + b).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {!isPro ? (
        <UpgradeModal
          title="Unlock cover letters"
          description="A cover letter draft and resume bullet rewrites for this exact posting, built from your real experience."
          preview={
            preview && (
              <ProPreview
                facts={[
                  { label: "It would lead with", items: preview.strengths },
                  { label: "Keywords it would work in", items: preview.keywords.slice(0, 6) },
                ]}
                outputLabel="Your cover letter and bullet rewrites"
                lines={3}
              />
            )
          }
        >
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <Lock className="size-4" />
            {lockedLabel ?? "Write my cover letter (Pro)"}
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
          <Sparkles className="size-4" />
          {label ?? "Write my cover letter"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Cover letter for this job
            </DialogTitle>
            <DialogDescription>
              Custom-generated cover letter and ATS-optimized resume bullet points for this specific role.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
                <WorklyLoader className="size-8 animate-spin text-primary" />
                <p>Analyzing job requirements & rewriting profile...</p>
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
              <div className="flex flex-col gap-8">
                {data.unverifiedNumbers && data.unverifiedNumbers.length > 0 && (
                  <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                    Check before sending: {data.unverifiedNumbers.join(", ")}. These numbers don&apos;t appear in your
                    profile, so only keep them if they&apos;re true.
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                    <FileText className="size-5" />
                    Cover Letter Draft
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap border border-border">
                    {data.coverLetter}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="size-5" />
                    Tailored Resume Bullets
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {data.resumeBullets.map((bullet, i) => (
                      <li key={i} className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed border border-border flex items-start gap-3">
                        <ChevronRight className="size-4 mt-0.5 text-primary shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {data && !loading && (
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied!" : "Copy All to Clipboard"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
