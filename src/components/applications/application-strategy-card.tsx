"use client";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

import { useState } from "react";
import { PenTool, Loader2, AlertCircle, Lock } from "lucide-react";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ApplicationStrategyCardProps {
  applicationId: string;
  isPro?: boolean;
}

export function ApplicationStrategyCard({ applicationId, isPro = false }: ApplicationStrategyCardProps) {
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
        <CardTitle className="flex items-center gap-2">
          <PenTool className="size-5 text-primary" />
          Auto-Tailor (Cover Letter & Resume)
        </CardTitle>
        <CardDescription>
          Your strongest honest angle for this role, resume edits based on your real experience, what a screener may flag, and a cover letter draft.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!content && !loading && !isPro && (
          <UpgradeModal
            title="Unlock Application Strategy"
            description="Your strongest honest angle for this job, resume edits based on your real experience, what a screener may flag, and a cover letter draft."
          >
            <Button variant="outline" className="gap-2">
              <Lock className="size-4" />
              Generate Strategy (Pro)
            </Button>
          </UpgradeModal>
        )}
        {!content && !loading && isPro && (
          <Button onClick={handleGenerate} className="gap-2">
            <PenTool className="size-4" />
            Generate Strategy
          </Button>
        )}
        
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <WorklyLoader className="size-6 animate-spin" />
            <span className="ml-3">Reading the job against your profile and drafting your strategy...</span>
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
                Regenerate Strategy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
