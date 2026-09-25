"use client";

import { useState } from "react";
import { BrainCircuit, CheckCircle2, Copy, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateInterviewPrepAction } from "@/lib/opportunities/pro-actions";
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

export function InterviewIntelButton({
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
  const [data, setData] = useState<{ questions: Array<{question: string, redFlag: string, greenFlag: string}> } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateInterviewPrepAction(opportunityId);
      if ("error" in res) setError(res.error);
      else setData(res.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!data?.questions || !Array.isArray(data.questions)) return;
    const text = data.questions.map((q: any, i: number) => `Q${i + 1}: ${q.question}\nRed Flag: ${q.redFlag}\nGreen Flag: ${q.greenFlag}\n`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {!isPro ? (
        <UpgradeModal
          title="Unlock likely interview questions"
          description="The questions this company is likely to ask you, aimed at your weak spots, with what strong and weak answers sound like."
          preview={
            preview && (
              <ProPreview
                facts={[
                  { label: "Questions would probe", items: preview.gaps },
                  { label: "Skills they're likely to test", items: preview.keywords.slice(0, 6) },
                ]}
                outputLabel="Questions with strong and weak answers"
                lines={3}
              />
            )
          }
        >
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <Lock className="size-4" />
            {lockedLabel ?? "Likely interview questions (Pro)"}
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
          <BrainCircuit className="size-4" />
          {label ?? "Likely interview questions"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-primary" />
              Likely interview questions
            </DialogTitle>
            <DialogDescription>
              5 high-pressure interview questions the hiring manager is likely to ask, based on your exact profile and this job description.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto bg-muted/10">
            {loading && (
              <div className="flex justify-center py-10">
                <AiProgress
                  steps={["Reading the job and the company", "Finding where your evidence is thin", "Writing the questions they're likely to ask", "Adding what strong and weak answers sound like"]}
                  stepSeconds={8}
                  note="Usually 25-40 seconds."
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
              <div className="flex flex-col gap-6">
                {Array.isArray(data?.questions) ? data.questions.map((q: any, i: number) => (
                  <div key={i} className="flex flex-col gap-3 bg-background border border-border rounded-xl p-5 shadow-sm">
                    <h4 className="font-semibold text-base text-foreground leading-snug">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      {q.question}
                    </h4>
                    
                    <div className="grid sm:grid-cols-2 gap-4 mt-2">
                      <div className="flex flex-col gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-sm">
                          <ShieldAlert className="size-4" />
                          Red Flag Answer
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {q.redFlag}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium text-sm">
                          <ShieldCheck className="size-4" />
                          Green Flag Answer
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {q.greenFlag}
                        </p>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">Failed to parse interview questions. Please try again.</p>}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {data && !loading && (
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied!" : "Copy Questions"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
