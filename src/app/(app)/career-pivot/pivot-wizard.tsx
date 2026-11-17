"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles, XCircle, ArrowRightLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generatePivotAction, type PivotData } from "@/lib/pivot/actions";

/** The robot, while Work-ly reads. No aura, no bold pulsing promise. */
function Thinking() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <Image
          src="/workly-bot.png"
          alt=""
          width={120}
          height={120}
          className="size-28 object-contain motion-safe:animate-[bob_3s_ease-in-out_infinite]"
        />
        <p className="text-lg font-semibold text-foreground">Reading your experience…</p>
        <p className="text-sm text-muted-foreground">About 20 to 40 seconds.</p>
      </div>
    </div>
  );
}

export function PivotWizard({ initialData }: { initialData: PivotData | null }) {
  const [targetRole, setTargetRole] = useState(initialData?.targetRole || "");
  const [targetIndustry, setTargetIndustry] = useState(initialData?.targetIndustry || "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pivot, setPivot] = useState<PivotData | null>(initialData);

  // Score Animation state
  const [displayScore, setDisplayScore] = useState(initialData?.beforeScore ?? 0);
  const [showAfterScore, setShowAfterScore] = useState(false);

  useEffect(() => {
    if (pivot && showAfterScore) {
      const target = pivot.afterScore;
      let current = pivot.beforeScore;
      setDisplayScore(current);
      const interval = setInterval(() => {
        if (current < target) {
          current += 1;
          setDisplayScore(current);
        } else {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    } else if (pivot && !showAfterScore) {
      setDisplayScore(pivot.beforeScore);
    }
  }, [showAfterScore, pivot]);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowAfterScore(false);

    startTransition(async () => {
      const res = await generatePivotAction(targetRole, targetIndustry);
      if (res.error || !res.pivot) {
        setError(res.error ?? "Something went wrong. Please try again.");
        return;
      }
      // Update straight from what the action just computed - no full
      // reload needed, and no risk of the page briefly flashing back to
      // the "Start Your Transition" form while a fresh page load refetches.
      setPivot(res.pivot);
      setTargetRole(res.pivot.targetRole);
      setTargetIndustry(res.pivot.targetIndustry);
    });
  }

  if (!pivot) {
    return (
    <>

      {pending && <Thinking />}

      <Card className="max-w-xl mx-auto mt-8 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Which field are you moving into?</CardTitle>
          <CardDescription>Work-ly reads what you&apos;ve already done and writes it again in the words that field uses.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="targetRole">The role you want</Label>
              <Input id="targetRole" placeholder="e.g. Product Manager" required value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetIndustry">The field you're moving into</Label>
              <Input id="targetIndustry" placeholder="e.g. healthcare, fintech" required value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} />
            </div>
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <WorklyLoader className="mr-2 animate-spin size-4" /> : <Sparkles className="mr-2 size-4" />}
              {pending ? "Reading your experience…" : "Show me how it translates"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">

      {pending && <Thinking />}

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {/* Before and after */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">How a recruiter in that field would read you</h3>
            <div className="text-7xl font-bold tabular-nums text-foreground mb-4">
              {displayScore}<span className="text-3xl text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {showAfterScore
                ? "An estimate, after the rewrite. Not a promise."
                : "An estimate, using your resume as it reads today."}
            </p>
            {!showAfterScore && (
              <Button className="mt-6" variant="outline" onClick={() => setShowAfterScore(true)}>
                See it after the rewrite <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" /> How to introduce yourself</CardTitle>
            <CardDescription>Two lines for a cover letter, or the answer to &ldquo;tell me about yourself&rdquo;.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg italic text-muted-foreground border-l-4 border-primary/50 pl-4 py-2">
              "{pivot.superpowerPitch}"
            </p>
          </CardContent>
        </Card>
      </div>

      {/* What carries over */}
      {pivot.competencyMapping.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">What carries over</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {pivot.competencyMapping.map((map, i) => (
              <Card key={i}>
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground line-through">{map.oldSkill}</span>
                    <ArrowRightLeft className="size-4 text-primary" />
                    <span className="text-foreground">{map.newSkill}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{map.explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* The rewritten lines */}
      {pivot.translatedBullets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Your lines, rewritten</h2>
          <Card>
            <div className="divide-y divide-border">
              {pivot.translatedBullets.map((bullet, i) => (
                <div key={i} className="p-5 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Original</h4>
                    <p className="text-sm text-muted-foreground">{bullet.original}</p>
                  </div>
                  <div className="relative">
                    <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 -ml-2 bg-background p-1 text-primary">
                      <ArrowRight className="size-4" />
                    </div>
                    <h4 className="text-xs uppercase font-semibold text-primary mb-2">Rewritten</h4>
                    <p className="text-sm font-medium text-foreground">{bullet.translated}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* What is still missing */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">What you&apos;d still need</h2>
        {pivot.hardGaps.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {pivot.hardGaps.map((gap, i) => (
              <Card key={i} className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-5 flex flex-col gap-2">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <XCircle className="size-4" /> {gap.missingSkill}
                  </h4>
                  <p className="text-sm text-muted-foreground">{gap.actionPlan}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing major missing. What you&apos;ve done already covers what this kind of role asks for.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 pt-8 border-t border-border">
        <p className="text-xs text-muted-foreground">Running this again replaces what&apos;s here. Only the latest one is kept.</p>
        <form onSubmit={handleGenerate} className="flex flex-wrap gap-4 items-center justify-center">
            <span className="text-sm text-muted-foreground">Try a different field:</span>
            <Input className="w-48 h-8" placeholder="Role" required value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            <Input className="w-48 h-8" placeholder="Field" required value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} />
            <Button size="sm" type="submit" disabled={pending}>
              {pending ? <WorklyLoader className="animate-spin size-4" /> : "Run it again"}
            </Button>
         </form>
      </div>

    </div>
  );
}
