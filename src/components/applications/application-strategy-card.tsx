"use client";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

import { useState } from "react";
import { PenTool, Loader2, AlertCircle, Lock } from "lucide-react";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { ProPreview, ToolBrand } from "@/components/guidance/pro-preview";
import type { PreviewData } from "@/lib/guidance/preview-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AiProgress } from "@/components/shared/ai-progress";

interface ApplicationStrategyCardProps {
  applicationId: string;
  isPro?: boolean;
  preview?: PreviewData;
}

export function ApplicationStrategyCard({ applicationId, isPro = false, preview }: ApplicationStrategyCardProps) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/strategy`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate strategy.");
      }
      const data = await res.json();
      setContent(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <PenTool className="size-5 text-primary" />
          Your angle + cover letter
          <ToolBrand>Auto-Tailor</ToolBrand>
        </CardTitle>
        <CardDescription>
          Your strongest honest angle for this role, resume edits based on your real experience, what a screener may flag, and a cover letter draft.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!content && !loading && !isPro && (
          <ProPreview
            facts={[
              { label: "Where you already fit (from your fit analysis)", items: preview?.strengths ?? [] },
              { label: "What a screener may flag", items: preview?.gaps ?? [] },
            ]}
            outputLabel="Your pitch, resume edits and a cover letter draft"
          >
            <UpgradeModal
              title="Unlock your angle + cover letter"
              description="Your strongest honest angle for this job, resume edits based on your real experience, what a screener may flag, and a cover letter draft."
            >
              <Button variant="outline" className="w-full gap-2 sm:w-auto">
                <Lock className="size-4" />
                Build my angle (Pro)
              </Button>
            </UpgradeModal>
          </ProPreview>
        )}
        {!content && !loading && isPro && (
          <Button onClick={handleGenerate} className="gap-2">
            <PenTool className="size-4" />
            Build my angle + cover letter
          </Button>
        )}
        
        {loading && (
          <div className="py-4">
            <AiProgress
              steps={["Reading the job against your profile", "Finding your strongest honest angle", "Spotting what a screener may flag", "Drafting your cover letter"]}
              stepSeconds={8}
              note="Usually 25-40 seconds."
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {content && !loading && (
          <div className="mt-4 rounded-lg bg-background p-6 border shadow-sm">
            <MarkdownRenderer content={content} className="text-foreground/90" />
            <div className="mt-6 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-2">
                <PenTool className="size-4" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
