"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { TypewriterMarkdown } from "@/components/shared/typewriter-markdown";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";
import { ProPreview, ToolBrand } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";

interface ResumeTailorCardProps {
  applicationId: string;
}

export function ResumeTailorCard({
  applicationId,
  isPro = false,
  preview,
}: ResumeTailorCardProps & { isPro?: boolean; preview?: PreviewData }) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTailor = async () => {
    setLoading(true);
    setContent(null);
    try {
      setError(null);
      const res = await fetch(`/api/applications/${applicationId}/tailor-resume`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setContent(data.text);
      } else {
        setError(data.error || "Failed to generate tailored resume.");
      }
    } catch (e) {
      console.error(e);
      setError("A network error occurred.");
    }
    setLoading(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <FileText className="size-5 text-primary" />
          Resume bullets for this job
          <ToolBrand>AI Resume Tailor</ToolBrand>
        </CardTitle>
        <CardDescription>
          Rewrites your experience bullets and keywords against this job description, using only what your experience actually shows.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!content ? (
          !isPro ? (
            <ProPreview
              intro={
                preview?.latestRole
                  ? `Work-ly would rewrite ${preview.latestRoleLines > 0 ? `the ${preview.latestRoleLines} bullets` : "the bullets"} from your role as ${preview.latestRole}${preview.roleCount > 1 ? ` and your ${preview.roleCount - 1} other role${preview.roleCount > 2 ? "s" : ""}` : ""} against this posting.`
                  : "Work-ly would rewrite your experience bullets against this posting."
              }
              facts={[{ label: "Keywords from this posting (used only where your experience backs them up)", items: preview?.keywords ?? [] }]}
              outputLabel="Your rewritten bullets and keyword check"
            >
              <UpgradeModal title="Unlock resume bullets for this job" description="Rewrite your resume for this exact job, from your real experience, so it gets past the screeners.">
                <Button className="w-full gap-2 sm:w-auto">
                  <Lock className="size-4" />
                  Tailor my bullets (Pro)
                </Button>
              </UpgradeModal>
            </ProPreview>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={handleTailor} disabled={loading} className="w-full sm:w-auto gap-2">
                {loading ? <WorklyLoader className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Reading the job and your profile..." : error ? "Try again" : "Tailor my bullets for this job"}
              </Button>
              {error && !loading && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-5 bg-muted/30 rounded-lg border shadow-sm prose dark:prose-invert max-w-none text-sm leading-relaxed">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent-foreground border border-accent/20">
                <Sparkles className="size-3" />
                AI-generated — review before use
              </div>
              <TypewriterMarkdown content={content} speed={8} />
            </div>
            <Button variant="outline" onClick={() => setContent(null)} className="w-full sm:w-auto">
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
