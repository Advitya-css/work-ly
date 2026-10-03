"use client";

import { WorklyLoader } from "@/components/shared/workly-loader";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Lock, ArrowRight, ShieldCheck, FileText, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AccountButtons } from "@/components/marketing/account-buttons";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { scoreResumeAction } from "./actions";
import { importFromGraderAction } from "@/lib/onboarding/grader-import";
import { clearGraderDraft, saveGraderDraft } from "@/lib/grader-draft";
import { getFoundingOfferAction } from "@/lib/payments/founding-actions";
import { discountedPrice, foundingSummary, type PublicFoundingOffer } from "@/lib/payments/founding-core";
import { GUARANTEE } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";

const PASS = PAID_PLANS.find((p) => p.interval === "quarterly")!;

export default function FreeGraderPage() {
  const [jobText, setJobText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [importing, startImport] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);
  const [founding, setFounding] = useState<PublicFoundingOffer | null>(null);
  const [result, setResult] = useState<{
    signedIn: boolean;
    isPro: boolean;
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
        // Kept in this browser so signing up picks up this resume and job.
        saveGraderDraft({ resumeText, jobText });
      }
    });
  }

  // The founding offer, for the "next step" card once there is a result.
  useEffect(() => {
    if (!result) return;
    getFoundingOfferAction()
      .then(setFounding)
      .catch(() => undefined);
  }, [result]);

  /** Signed in: turn this check into a tracked job with the full report. */
  function openInAccount() {
    setImportError(null);
    startImport(async () => {
      const res = await importFromGraderAction({ resumeText, jobText });
      if (res.opportunityId) {
        clearGraderDraft();
        router.push(`/opportunities/${res.opportunityId}`);
      } else {
        setImportError(res.error ?? "That didn't work. Please try again.");
      }
    });
  }

  const fullReportCta = (label: string) =>
    result?.signedIn ? (
      <Button size="sm" className="w-full font-bold" onClick={openInAccount} disabled={importing}>
        {importing ? <WorklyLoader className="size-4 animate-spin mr-1" /> : null}
        {importing ? "Opening your full report..." : label}
        {!importing && <ArrowRight className="size-4 ml-1" />}
      </Button>
    ) : (
      <Button asChild size="sm" className="w-full font-bold">
        <Link href="/signup">{label} <ArrowRight className="size-4 ml-1" /></Link>
      </Button>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Minimal */}
      <header className="sticky top-0 z-50 flex h-14 w-full items-center border-b border-border/40 bg-background/95 px-6 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
          Work-ly <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">Fit Check</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <AccountButtons startLabel="Sign up free" shortStartLabel="Sign up" />
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
                              <span
                                className={result.signedIn ? "text-xs text-muted-foreground" : "blur-[5px] select-none text-xs text-muted-foreground"}
                                aria-hidden={result.signedIn ? undefined : true}
                              >
                                {gap.fix}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-border bg-background/80 p-4 text-center">
                        <Lock className="size-5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {result.signedIn
                            ? "Open the full report in your account to see how to close each gap."
                            : "Create a free account to see how to close each gap. Your resume and this job come with you - no pasting again."}
                        </p>
                        {fullReportCta(result.signedIn ? "Open the full report" : "See how to close these")}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-primary/30">
              <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                    Next: a resume tailored to this job
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result.isPro
                      ? "Open this job in your account to build the tailored resume and cover letter - only from what's already on your resume."
                      : "Work-ly Pro rewrites your resume and writes the cover letter for this exact job, using only what's already on your resume. It never adds skills you don't have."}
                  </p>
                  {!result.isPro && (
                  <p className="text-xs text-muted-foreground">
                    {founding ? (
                      <>
                        <span className="font-semibold text-primary">Founding members: {foundingSummary(founding, { forWhom: false })}.</span>{" "}
                        3-Month Pass {discountedPrice(PASS.priceUsd, founding.percentOff)} instead of {PASS.price}.{" "}
                      </>
                    ) : (
                      <>{PASS.price} for 3 months with the 3-Month Pass. </>
                    )}
                    {GUARANTEE.sentence}.
                  </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:w-56">
                  {fullReportCta("Tailor my resume for this job")}
                  {!result.isPro && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/pricing">See Pro plans</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            {importError && (
              <p role="alert" className="text-center text-sm text-destructive">{importError}</p>
            )}

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
