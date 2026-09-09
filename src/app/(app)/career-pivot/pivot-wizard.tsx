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

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* The AI Aura */}
              <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full animate-pulse mix-blend-screen scale-150" />
              <div className="absolute inset-2 bg-blue-500/30 blur-2xl rounded-full animate-pulse delay-75 mix-blend-screen scale-125" />

              {/* The Bot */}
              <div className="relative w-full h-full animate-float">
                <Image src="/workly-bot.png" alt="Thinking Bot" fill className="object-contain drop-shadow-2xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold animate-pulse text-primary">Work-ly is analyzing your competencies...</h3>
            <p className="text-sm text-muted-foreground">This takes about 5 seconds.</p>
          </div>
        </div>
      )}

      <Card className="max-w-xl mx-auto mt-8 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Start Your Transition</CardTitle>
          <CardDescription>We will deeply translate your current Career Profile into a new industry's language.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="targetRole">Target Role</Label>
              <Input id="targetRole" placeholder="e.g. Product Manager" required value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetIndustry">Target Industry</Label>
              <Input id="targetIndustry" placeholder="e.g. EdTech or Fintech" required value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} />
            </div>
            {error && (
              <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <WorklyLoader className="mr-2 animate-spin size-4" /> : <Sparkles className="mr-2 size-4" />}
              {pending ? "Analyzing competencies..." : "Build Transition Strategy"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 animate-pulse">
              <Image src="/workly-bot.png" alt="Thinking Bot" fill className="object-contain drop-shadow-2xl" />
            </div>
            <h3 className="text-xl font-bold animate-pulse text-primary">Work-ly is analyzing your competencies...</h3>
            <p className="text-sm text-muted-foreground">This takes about 5 seconds.</p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {/* Before & After Validation */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">ATS Match Score</h3>
            <div className="text-7xl font-bold tabular-nums text-foreground mb-4">
              {displayScore}<span className="text-3xl text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {showAfterScore
                ? "AI's honest estimate after your competencies are translated - not a guarantee."
                : "AI's honest estimate using your original wording, before translation."}
            </p>
            {!showAfterScore && (
              <Button className="mt-6" variant="outline" onClick={() => setShowAfterScore(true)}>
                Apply AI Translation <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="size-5 text-primary" /> The Superpower Pitch</CardTitle>
            <CardDescription>Use this narrative in your cover letter and interviews.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg italic text-muted-foreground border-l-4 border-primary/50 pl-4 py-2">
              "{pivot.superpowerPitch}"
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competency Bridge */}
      {pivot.competencyMapping.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">The Competency Bridge</h2>
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

      {/* Bullet Translation */}
      {pivot.translatedBullets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Resume Translation</h2>
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
                    <h4 className="text-xs uppercase font-semibold text-primary mb-2">Translated</h4>
                    <p className="text-sm font-medium text-foreground">{bullet.translated}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Hard Gaps */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Skill Gap Action Plan</h2>
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
            No major hard gaps found - your background already covers what this role typically needs.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 pt-8 border-t border-border">
        <p className="text-xs text-muted-foreground">Running this again replaces your current pivot strategy - it isn't saved separately.</p>
        <form onSubmit={handleGenerate} className="flex flex-wrap gap-4 items-center justify-center">
            <span className="text-sm text-muted-foreground">Want to try a different industry?</span>
            <Input className="w-48 h-8" placeholder="Target Role" required value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            <Input className="w-48 h-8" placeholder="Target Industry" required value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} />
            <Button size="sm" type="submit" disabled={pending}>
              {pending ? <WorklyLoader className="animate-spin size-4" /> : "Re-run Pivot"}
            </Button>
         </form>
      </div>

    </div>
  );
}
