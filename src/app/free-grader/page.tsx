"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Lock, ArrowRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { scoreResumeAction } from "./actions";

export default function FreeGraderPage() {
  const [jobText, setJobText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number | null;
    summary: string;
    strengths: { requirement: string; evidence: string }[];
    gaps: { requirement: string; mustHave: boolean; partly: boolean; fix: string }[];
  } | null>(null);

  function handleScore() {
    setError(null);
    if (!jobText.trim() || !resumeText.trim()) {
      setError("Please paste both your resume and the job description.");
      return;
    }
    
    startTransition(async () => {
      const res = await scoreResumeAction(resumeText, jobText);
      if ("error" in res && res.error) {
        setError(res.error);
      } else if ("data" in res && res.data) {
        setResult(res.data);
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Minimal */}
      <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border/40 bg-background/95 px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
          Work-ly <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">Fit Check</span>
        </Link>
        <div className="ml-auto">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="ml-2">
            <Link href="/signup">Sign up free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">

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
            <h3 className="text-xl font-bold animate-pulse text-primary">Reading the job against your resume...</h3>
            <p className="text-sm text-muted-foreground">This usually takes 10-20 seconds.</p>
          </div>
        </div>
      )}

        <div className="text-center mb-12 flex flex-col items-center">
          <div className={`relative w-24 h-24 mb-4 drop-shadow-xl transition-all duration-300 hover:rotate-12 hover:scale-110 cursor-pointer ${pending ? "animate-pulse scale-105" : "animate-float"}`}>
            <Image src="/workly-bot.png" alt="Work-ly Bot" fill className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Would a recruiter shortlist you for this job?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Paste a job description and your resume. Work-ly checks every key requirement against your resume, quotes the evidence it finds, and tells you what would get you screened out.
          </p>
        </div>

        {!result ? (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="size-5" /> Job Description</CardTitle>
                <CardDescription>Paste the raw text of the role you want.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                <Textarea 
                  placeholder="e.g. We are looking for a Senior Product Manager with 5+ years of experience in B2B SaaS..." 
                  className="min-h-[300px] font-mono text-sm resize-y"
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                />
                {pending && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md border-2 border-primary/50">
                    <div className="absolute left-0 right-0 h-1 bg-primary/80 shadow-[0_0_15px_3px_rgba(var(--primary),0.5)] animate-scan z-10" />
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" /> Your Resume</CardTitle>
                <CardDescription>Paste the raw text of your current resume.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                <Textarea 
                  placeholder="e.g. ACME Corp | Product Manager | Jan 2020 - Present..." 
                  className="min-h-[300px] font-mono text-sm resize-y"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                {pending && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md border-2 border-primary/50">
                    <div className="absolute left-0 right-0 h-1 bg-primary/80 shadow-[0_0_15px_3px_rgba(var(--primary),0.5)] animate-scan z-10" />
                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Candidate Fit</div>
                {result.score != null ? (
                  <div className="text-7xl font-bold tracking-tighter mb-4 text-foreground tabular-nums">
                    {result.score}<span className="text-3xl text-muted-foreground">/100</span>
                  </div>
                ) : (
                  <div className="text-2xl font-semibold mb-4 text-foreground">Not enough to score</div>
                )}
                <p className="text-muted-foreground max-w-md">{result.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground max-w-md">
                  How well your resume shows this job&apos;s requirements. Not a hiring probability.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-success">What your resume already proves</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.strengths.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing in the resume clearly shows this job&apos;s key requirements yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">{s.requirement}</span>
                            {s.evidence && <span className="block text-xs text-muted-foreground mt-0.5">&ldquo;{s.evidence}&rdquo;</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">What could get you screened out</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.gaps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No key requirement is clearly missing. Tailor and apply.</p>
                  ) : (
                    <>
                      <ul className="space-y-3">
                        {result.gaps.map((gap, i) => (
                          <li key={i} className="flex flex-col gap-1 text-sm">
                            <span className="font-medium text-foreground">
                              {gap.requirement}
                              {gap.mustHave && <span className="ml-2 text-xs font-semibold uppercase text-destructive">Must-have</span>}
                              {gap.partly && <span className="ml-2 text-xs text-muted-foreground">(partly shown)</span>}
                            </span>
                            {gap.fix && (
                              <span className="blur-[5px] select-none text-xs text-muted-foreground" aria-hidden="true">
                                {gap.fix}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-border bg-background/80 p-4 text-center">
                        <Lock className="size-5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Create a free account to see how to close each gap, get a week-by-week plan, and find jobs you already fit.
                        </p>
                        <Button asChild size="sm" className="w-full font-bold">
                          <Link href="/signup">See how to close these <ArrowRight className="size-4 ml-1" /></Link>
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center pt-4">
              <Button variant="ghost" onClick={() => setResult(null)}>Scan another resume</Button>
            </div>
          </div>
        )}

        {!result && (
          <div className="flex flex-col items-center justify-center gap-4">
            {error && (
              <Alert variant="destructive" className="max-w-md">
                <AlertDescription className="flex flex-col items-start gap-3">
                  <span>{error}</span>
                  {error.includes("Create a free account") && (
                    <Button asChild size="sm" className="font-bold">
                      <Link href="/signup">Create free account <ArrowRight className="size-4 ml-1" /></Link>
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <Button size="lg" className="w-full max-w-sm font-semibold text-base" onClick={handleScore} disabled={pending}>
              {pending ? <WorklyLoader className="animate-spin mr-2" /> : null}
              {pending ? "Checking every requirement..." : "Check My Fit"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
