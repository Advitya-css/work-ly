"use client";

import { useState } from "react";
import { Send, Loader2, Users, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

export function AlumniNetworkingCard() {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [content, setContent] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!target) return;
    setLoading(true);
    setContent(null);
    try {
      const res = await fetch(`/api/student/alumni-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCompany: target }),
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.text);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="size-5 text-primary" />
          Alumni Cold Emailer
        </CardTitle>
        <CardDescription>
          Find a hiring manager on LinkedIn who went to your university. Enter their company below, and the AI will draft a highly-converting cold email leveraging your shared alumni connection.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!content ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Target Company</Label>
              <Input placeholder="e.g. Stripe, Google, or Deloitte" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <Button onClick={handleGenerate} disabled={loading || !target} className="w-full sm:w-auto gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {loading ? "Drafting Email..." : "Draft Alumni Email"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 bg-muted/30 rounded-lg border shadow-sm prose dark:prose-invert max-w-none text-sm">
              <MarkdownRenderer content={content} />
            </div>
            <Button variant="outline" onClick={() => setContent(null)} className="w-full sm:w-auto">
              Draft Another
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
