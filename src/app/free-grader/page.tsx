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
  const [result, setResult] = useState<{ score: number; strengths: string[]; gaps: string[] } | null>(null);

  function handleScore() {
    setError(null);
    if (!jobText.trim() || !resumeText.trim()) {
      setError("Please paste both your resume and the job description.");
      return;
    }
    
    startTransition(async () => {
      const res = await scoreResumeAction(resumeText, jobText);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setResult(res.data);
      }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Minimal */}
      <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border/40 bg-background/95 px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
          Work-ly <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">ATS Scanner</span>
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
            <h3 className="text-xl font-bold animate-pulse text-primary">Simulating ATS filters...</h3>
            <p className="text-sm text-muted-foreground">This takes about 5 seconds.</p>
          </div>
        </div>
      )}

        <div className="text-center mb-12 flex flex-col items-center">
          <div className={`relative w-24 h-24 mb-4 drop-shadow-xl transition-all duration-300 hover:rotate-12 hover:scale-110 cursor-pointer ${pending ? "animate-pulse scale-105" : "animate-float"}`}>
            <Image src="/workly-bot.png" alt="Work-ly Bot" fill className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Will your resume survive the ATS?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Paste a job description and your resume below. Our AI will brutally score your fit and tell you exactly why a recruiter might reject you.
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
                <div className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">ATS Match Score</div>
                <div className="text-7xl font-bold tracking-tighter mb-4 text-foreground">
                  {result.score}<span className="text-3xl text-muted-foreground">/100</span>
                </div>
                <p className="text-muted-foreground max-w-md">
                  {result.score >= 80 ? "Strong fit! But you still have some gaps to close before you apply." : result.score >= 50 ? "Moderate fit. The ATS might flag you unless you fix the missing keywords." : "Low fit. You will likely be auto-rejected unless you significantly tailor your resume."}
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 dark:text-green-400">Why you match</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.strengths.map((str, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">Missing Keywords (Gaps)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 blur-[6px] select-none opacity-50">
                    {result.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm"><Lock className="size-4 mt-0.5 shrink-0" /><span>{gap}</span></li>
                    ))}
                  </ul>

                  {/* Paywall Overlay */}
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px] p-6 text-center">
                    <Lock className="size-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold mb-2">Analysis Locked</h3>
                    <p className="text-xs text-muted-foreground mb-4">Create a free account to see exactly what you are missing and let our AI auto-tailor your resume.</p>
                    <Button asChild size="sm" className="w-full font-bold">
                      <Link href="/signup">Unlock Full Analysis <ArrowRight className="size-4 ml-1" /></Link>
                    </Button>
                  </div>
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
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button size="lg" className="w-full max-w-sm font-semibold text-base" onClick={handleScore} disabled={pending}>
              {pending ? <WorklyLoader className="animate-spin mr-2" /> : null}
              {pending ? "Analyzing ATS Match..." : "Score My Resume"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
