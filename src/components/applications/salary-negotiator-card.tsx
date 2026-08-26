"use client";

import { useState } from "react";
import { Handshake, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SalaryNegotiatorCardProps {
  applicationId: string;
}

export function SalaryNegotiatorCard({ applicationId }: SalaryNegotiatorCardProps) {
  const [baseOffer, setBaseOffer] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [leverage, setLeverage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!baseOffer || !targetSalary) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseOffer, targetSalary, leverage }),
      });
      if (!res.ok) throw new Error("Failed to generate script.");
      const data = await res.json();
      setScript(data.text);
    } catch (err) {
      setError("Something went wrong generating the script.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-500">
          <Handshake className="size-5" />
          Salary Negotiator
        </CardTitle>
        <CardDescription>
          Generate the perfect professional counter-offer email based on your leverage.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!script ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Base Offer Received</Label>
                <Input placeholder="e.g. $120,000" value={baseOffer} onChange={e => setBaseOffer(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Target Salary</Label>
                <Input placeholder="e.g. $135,000" value={targetSalary} onChange={e => setTargetSalary(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Leverage / Additional Context</Label>
              <Textarea 
                placeholder="e.g. I have another offer for 130k, or I meet 100% of the senior requirements."
                value={leverage}
                onChange={e => setLeverage(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading || !baseOffer || !targetSalary} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate Counter-Offer Email
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-background rounded-lg border shadow-sm prose dark:prose-invert max-w-none text-sm">
              <MarkdownRenderer content={script} />
            </div>
            <Button variant="outline" onClick={() => setScript(null)} className="w-full">
              Start Over
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
