"use client";

import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { UpgradeModal } from "@/components/paywall/upgrade-modal";
import { Lock } from "lucide-react";

interface ResumeTailorCardProps {
  applicationId: string;
}

export function ResumeTailorCard({ applicationId, isPro = false }: ResumeTailorCardProps & { isPro?: boolean }) {
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
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          AI Resume Tailor
        </CardTitle>
        <CardDescription>
          Before you apply, let the AI compare your base profile against this specific job description to generate optimized bullet points and ATS keywords.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!content ? (
          !isPro ? (
            <UpgradeModal title="Unlock AI Resume Tailoring" description="Instantly rewrite your resume to beat the ATS filters for this exact job.">
              <Button className="w-full gap-2 bg-primary/90 hover:bg-primary sm:w-auto">
                <Lock className="size-4" />
                Tailor Resume (Pro)
              </Button>
            </UpgradeModal>
          ) : (
            <Button onClick={handleTailor} disabled={loading} className="w-full sm:w-auto gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Analyzing Job & Profile..." : "Tailor Resume for this Job"}
            </Button>
          )
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-5 bg-muted/30 rounded-lg border shadow-sm prose dark:prose-invert max-w-none text-sm leading-relaxed">
              <MarkdownRenderer content={content} />
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
