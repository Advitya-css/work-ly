"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InterviewPrepCardProps {
  applicationId: string;
}

export function InterviewPrepCard({ applicationId }: InterviewPrepCardProps) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interview-prep`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate prep.");
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
          <Sparkles className="size-5 text-primary" />
          AI Interview Prep (Grill Me)
        </CardTitle>
        <CardDescription>
          Generate 5 realistic, role-specific interview questions based on the job requirements and your unique skill gaps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!content && !loading && (
          <Button onClick={handleGenerate} className="gap-2">
            <Sparkles className="size-4" />
            Generate Custom Interview
          </Button>
        )}
        
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-3">Gemini is analyzing the job and crafting questions...</span>
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
            <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-mono">{content}</div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-2">
                <Sparkles className="size-4" />
                Regenerate Questions
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
