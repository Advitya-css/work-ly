"use client";

import { useState } from "react";
import { Loader2, Code2, Play, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

export function ChallengeClient({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<{ title: string; description: string } | null>(null);
  const [code, setCode] = useState("");
  
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const generateChallenge = async () => {
    setLoading(true);
    setChallenge(null);
    setFeedback(null);
    setCode("// Write your solution here...\n");
    try {
      const res = await fetch(`/api/applications/${applicationId}/challenge-generate`, { method: "POST" });
      const data = await res.json();
      if (data.title) {
        setChallenge(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const submitCode = async () => {
    if (!code.trim() || !challenge) return;
    setEvaluating(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/challenge-evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: challenge.title, description: challenge.description, code }),
      });
      const data = await res.json();
      setFeedback(data.text);
    } catch (e) {
      console.error(e);
    }
    setEvaluating(false);
  };

  if (!challenge && !loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="size-5 text-primary" />
            Domain-Specific Code Challenge
          </CardTitle>
          <CardDescription>
            We will read the job description and generate a real-world coding problem relevant to this company's business model. No generic LeetCode algorithms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateChallenge} className="gap-2">
            <Code2 className="size-4" />
            Generate Challenge
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Loader2 className="size-8 animate-spin" />
        <p>Analyzing job description and writing code challenge...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Left side: Problem Description */}
      <div className="flex flex-col gap-6">
        <Card className="h-full border-primary/20">
          <CardHeader className="bg-muted/50 border-b flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">{challenge?.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={generateChallenge} title="Generate New Problem">
              <RefreshCw className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6 prose dark:prose-invert max-w-none">
            {challenge?.description && <MarkdownRenderer content={challenge.description} />}
          </CardContent>
        </Card>
      </div>

      {/* Right side: Code Editor & Feedback */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm h-[500px]">
          <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">solution.ts</span>
            <Button size="sm" onClick={submitCode} disabled={evaluating} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white">
              {evaluating ? <Loader2 className="size-3 animate-spin mr-2" /> : <Play className="size-3 mr-2" />}
              Submit for Review
            </Button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-4 bg-zinc-950 text-green-400 font-mono text-sm focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>

        {feedback && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-5" />
                  Code Review
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm prose dark:prose-invert max-w-none">
                <MarkdownRenderer content={feedback} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
