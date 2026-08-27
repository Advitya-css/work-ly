"use client";

import { useState } from "react";
import { Mail, Loader2, Sparkles, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateFollowUpEmailAction } from "@/lib/applications/actions";
import type { Application } from "@/lib/db/types";

export function FollowUpTemplateCard({ application }: { application: Application }) {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if stale
  const now = new Date();
  const date = application.reachedInterviewAt ?? application.reachedAssessmentAt ?? application.dateApplied;
  const isStale = date && (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24) >= 7;

  if (!isStale && !template && !loading) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateFollowUpEmailAction(application.id);
      if (res.error) setError(res.error);
      else setTemplate(res.data || "");
    } catch (e) {
      setError("Failed to generate template.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!template) return;
    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Mail className="size-5" />
          Follow-up Required
        </CardTitle>
        <CardDescription>
          It's been over 7 days since your last update for {application.roleTitle}. Send a polite nudge to stay on their radar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!template && !loading && (
          <Button onClick={handleGenerate} className="w-fit gap-2">
            <Sparkles className="size-4" />
            Generate Follow-up Email
          </Button>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin text-primary" />
            Drafting email...
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        
        {template && (
          <div className="flex flex-col gap-3">
            <div className="bg-background rounded-lg p-4 text-sm whitespace-pre-wrap border border-border">
              {template}
            </div>
            <Button variant="outline" onClick={handleCopy} className="w-fit gap-2">
              {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
