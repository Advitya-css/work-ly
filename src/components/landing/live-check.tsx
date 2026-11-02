"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDashed, CircleSlash, Play, Quote, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AiProgress } from "@/components/shared/ai-progress";
import { WorklyLoader } from "@/components/shared/workly-loader";
import { previewOpeningAction, scoreResumeAction } from "@/app/free-grader/actions";
import { ShareVerdictButton } from "@/components/share/share-verdict-button";
import { foundingSummary, type PublicFoundingOffer } from "@/lib/payments/founding-core";
import type { OpeningPreview } from "@/lib/resume/opening-preview";
import { importFromGraderAction } from "@/lib/onboarding/grader-import";
import { clearGraderDraft, saveGraderDraft } from "@/lib/grader-draft";
import { cn } from "@/lib/utils";

type Row = { requirement: string; state: "met" | "partial" | "missing"; quote?: string; fix?: string; mustHave?: boolean };
interface Result {
  score: number | null;
  recommendation: string | null;
  headline: string;
  rows: Row[];
  signedIn: boolean;
  sample?: boolean;
  /** Signed share-card token (lib/share). */
  share?: string | null;
  /** One free look at the top of the tailored resume, after a yes. */
  previewTicket?: string | null;
}

/**
 * A REAL report, not a mockup: a public listing (Data & Analytics Engineer,
 * a consulting firm in Bangalore) checked against a sample resume on 26 Sep
 * 2026. Same rows as marketing/sample-report.tsx; employers withheld.
 */
const SAMPLE: Result = {
  score: 71,
  recommendation: "APPLY",
  headline: "2 must-haves shown, 1 partly, 1 to close",
  signedIn: false,
  sample: true,
  rows: [
    {
      requirement: "Proficiency in SQL, Python, data modeling and semantic layer",
      state: "met",
      quote: "Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.",
    },
    {
      requirement: "Knowledge of customer analytics KPIs across marketing, digital, sales and service",
      state: "met",
      quote: "Designed and analysed A/B tests for checkout changes, including one that lifted order conversion by 3.2%.",
    },
    {
      requirement: "Expertise in Tableau, ideally certified",
      state: "partial",
      quote: "Delivered Power BI and Tableau dashboards for 3 retail and banking clients.",
      fix: "Obtain Tableau Certified Data Analyst certification and document complex dashboard design projects.",
    },
    {
      requirement: "Working knowledge of AWS data services (Athena, Glue, Redshift)",
      state: "missing",
      fix: "Build a portfolio pipeline loading and querying data in AWS Redshift and Athena.",
    },
  ],
};

/** The verdict, in words a person would say. Same five steps as the app. */
const VERDICT: Record<string, { word: string; line: string; tone: string }> = {
  APPLY_NOW: { word: "Apply now.", line: "You're a strong fit. Don't sit on this one.", tone: "text-success" },
  APPLY: { word: "Apply.", line: "Worth your evening. Lead with what's proven below.", tone: "text-success" },
  STRETCH: { word: "A stretch.", line: "Within reach if you close the gap below first.", tone: "text-warning" },
  LOW_PRIORITY: { word: "Probably not.", line: "Your time is better spent on a closer match.", tone: "text-warning" },
  SKIP: { word: "Skip this one.", line: "It asks for things your resume can't show yet. That's an evening saved.", tone: "text-destructive" },
};

const ICON = {
  met: { icon: CheckCircle2, tone: "text-success", label: "Shown" },
  partial: { icon: CircleDashed, tone: "text-warning", label: "Partly shown" },
  missing: { icon: CircleSlash, tone: "text-destructive", label: "Not shown" },
} as const;

function Ring({ value, tone }: { value: number; tone: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const stroke = tone.replace("text-", "");
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className={cn(
            "animate-[ring_1.1s_cubic-bezier(0.16,1,0.3,1)_both]",
            stroke === "success" ? "stroke-success" : stroke === "warning" ? "stroke-warning" : "stroke-destructive",
          )}
          style={{ ["--ring-from" as string]: c }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[22px] font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/**
 * THE HOMEPAGE IS THE PRODUCT. Paste a job and your resume, no account, and
 * the honest verdict builds in front of you: apply, stretch or skip, every
 * point proven with a line from your own resume. Or watch it on a real
 * example first.
 */
export function LiveCheck({ offer = null }: { offer?: PublicFoundingOffer | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<OpeningPreview | null>(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [writing, startWriting] = useTransition();
  const [job, setJob] = useState("");
  const [resume, setResume] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [importing, startImport] = useTransition();

  function run() {
    setError(null);
    if (job.trim().length < 200 || resume.trim().length < 200) {
      setError("Paste the whole job posting and your whole resume. A few paragraphs each is enough.");
      return;
    }
    start(async () => {
      const res = await scoreResumeAction(resume, job);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (!("data" in res) || !res.data) return;
      const d = res.data;
      saveGraderDraft({ resumeText: resume, jobText: job });
      setPreview(null);
      setPreviewNote(null);
      setResult({
        share: d.share ?? null,
        previewTicket: d.previewTicket ?? null,
        score: d.score,
        recommendation: d.recommendation ?? null,
        headline: d.headline ?? "",
        signedIn: d.signedIn,
        rows: [
          ...d.strengths.map((s) => ({ requirement: s.requirement, state: "met" as const, quote: s.evidence })),
          ...d.gaps.map((g) => ({
            requirement: g.requirement,
            state: g.partly ? ("partial" as const) : ("missing" as const),
            fix: g.fix,
            mustHave: g.mustHave,
          })),
        ],
      });
    });
  }

  // A yes: write the top of their resume for this job straight away, while they're reading the verdict.
  const ticket = result?.previewTicket ?? null;
  useEffect(() => {
    if (!ticket) return;
    startWriting(async () => {
      try {
        const res = await previewOpeningAction(resume, job, ticket);
        if (res.preview) setPreview(res.preview);
        else setPreviewNote(res.error ?? null);
      } catch {
        // A dropped connection must never take the verdict down with it.
        setPreviewNote("Couldn't write it just now. The full version is one free account away.");
      }
    });
    // The ticket belongs to the texts that were checked; run once per ticket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  function openInAccount() {
    startImport(async () => {
      const res = await importFromGraderAction({ resumeText: resume, jobText: job });
      if (res.opportunityId) {
        clearGraderDraft();
        router.push(`/opportunities/${res.opportunityId}`);
      } else setError(res.error ?? "Couldn't open it in your account. Try again.");
    });
  }

  const verdict = result?.recommendation ? VERDICT[result.recommendation] : null;

  return (
    <div className="relative mx-auto w-full max-w-4xl text-left">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(28_26_25/0.05),0_16px_40px_-16px_rgb(122_46_85/0.18)]">
        {!result && !pending && (
          <div className="flex flex-col">
            <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <label className="flex flex-col">
                <span className="flex items-center justify-between px-5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  The job
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">{job.trim() ? `${job.trim().split(/\s+/).length} words` : ""}</span>
                </span>
                <textarea
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  placeholder="Paste the whole job posting…"
                  className="h-44 resize-none bg-transparent px-5 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-52"
                />
              </label>
              <label className="flex flex-col">
                <span className="flex items-center justify-between px-5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Your resume
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">{resume.trim() ? `${resume.trim().split(/\s+/).length} words` : ""}</span>
                </span>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="Paste your resume as text…"
                  className="h-44 resize-none bg-transparent px-5 py-3 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-52"
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 border-t border-border bg-secondary/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setResult(SAMPLE)}
                className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Play className="size-3.5" aria-hidden />
                No resume handy? Watch it on a real example
              </button>
              <Button size="lg" onClick={run} className="h-11 gap-2 px-6">
                Should I apply?
                <ArrowRight className="size-4" />
              </Button>
            </div>
            {error && <p className="border-t border-border px-5 py-3 text-[13px] text-destructive">{error}</p>}
          </div>
        )}

        {pending && (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-5 px-6 py-12">
            <AiProgress
              stepSeconds={6}
              steps={[
                "Reading the posting the way a recruiter would",
                "Listing every requirement and how much it matters",
                "Looking for proof of each one in your resume",
                "Deciding: apply, stretch or skip",
              ]}
              note="About 20-40 seconds. Nothing is invented: a requirement only counts if your resume says it."
            />
          </div>
        )}

        {result && (
          <div className="flex flex-col">
            <div className="flex flex-col gap-5 border-b border-border px-6 py-6 sm:flex-row sm:items-center sm:px-8">
              {result.score != null && <Ring value={result.score} tone={verdict?.tone ?? "text-success"} />}
              <div className="flex min-w-0 flex-col gap-1">
                {result.sample && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Real example · public listing vs a sample resume
                  </span>
                )}
                <p className={cn("text-[34px] font-semibold leading-none tracking-[-0.04em] sm:text-[40px]", verdict?.tone ?? "text-foreground")}>
                  {verdict?.word ?? "Not enough to judge yet."}
                </p>
                <p className="text-[14.5px] text-foreground/85">
                  {verdict?.line ?? "Your resume doesn't say enough about what this job asks for. Paste the full resume, or add to it first."}
                </p>
                {result.headline && <p className="text-[13px] text-muted-foreground">{result.headline}</p>}
              </div>
            </div>

            <ul className="stagger-children flex flex-col divide-y divide-border">
              {result.rows.map((row) => {
                const v = ICON[row.state];
                return (
                  <li key={row.requirement} className="flex gap-3.5 px-6 py-4 sm:px-8">
                    <v.icon className={cn("mt-0.5 size-[18px] shrink-0", v.tone)} aria-label={v.label} />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="text-[14.5px] leading-snug text-foreground">
                        {row.requirement}
                        {row.mustHave && row.state === "missing" && (
                          <span className="ml-2 rounded-md bg-destructive/15 px-1.5 py-0.5 align-middle text-[11px] font-medium text-destructive">Must-have</span>
                        )}
                      </p>
                      {row.quote && (
                        <p className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                          <Quote className="mt-1 size-3 shrink-0 text-primary" aria-hidden />
                          <span>{row.quote}</span>
                        </p>
                      )}
                      {row.fix && (
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          <span className="text-foreground/80">To close it: </span>
                          {row.fix}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {!result.sample && (writing || preview) && (
              <OpeningSheet
                preview={preview}
                writing={writing}
                offer={offer}
                signedIn={result.signedIn}
                onOpen={openInAccount}
                importing={importing}
              />
            )}
            {!result.sample && !writing && !preview && previewNote && result.previewTicket && (
              <p className="border-t border-border px-6 py-3 text-[13px] text-muted-foreground sm:px-8">{previewNote}</p>
            )}

            <div className="flex flex-col gap-3 border-t border-border bg-secondary/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-[13px] text-muted-foreground">
                {result.sample
                  ? "Every tick quotes the resume. Nothing counts without proof."
                  : result.recommendation === "SKIP" || result.recommendation === "LOW_PRIORITY"
                    ? "Better to know now. Work-ly can find jobs that fit what you've really done."
                    : "Next: the resume, cover letter and interview prep for this exact job, from your real experience."}
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {!result.sample && result.share && (
                  <ShareVerdictButton token={result.share} invites={result.signedIn} variant="ghost" size="default" className="text-muted-foreground" />
                )}
                <Button
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                    setPreview(null);
                    setPreviewNote(null);
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  {result.sample ? "Try mine" : "Check another"}
                </Button>
                {preview ? null : !result.sample && result.signedIn ? (
                  <Button onClick={openInAccount} disabled={importing} className="gap-2">
                    {importing ? <WorklyLoader className="size-4 animate-spin" /> : null}
                    Open the full report
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button asChild className="gap-2">
                    <Link href={result.sample ? "/signup" : "/signup?from=check"}>
                      {result.sample
                        ? "Create a free account"
                        : result.recommendation === "SKIP" || result.recommendation === "LOW_PRIORITY"
                          ? "Find better-fit jobs"
                          : "Write this application for me"}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The top of their resume for the job they just checked, written for real:
 * the summary and their two strongest lines, each rewritten from a line
 * that's really on their resume. The rest is shown as blurred bars (never
 * invented text) with the way to get it.
 */
function OpeningSheet({
  preview,
  writing,
  offer,
  signedIn,
  onOpen,
  importing,
}: {
  preview: OpeningPreview | null;
  writing: boolean;
  offer: PublicFoundingOffer | null;
  signedIn: boolean;
  onOpen: () => void;
  importing: boolean;
}) {
  const widths = ["w-11/12", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"];
  return (
    <section aria-label="The top of your resume for this job" className="flex flex-col gap-4 border-t border-border bg-accent/40 px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">The top of your resume, for this job</p>
        <p className="text-[13px] text-muted-foreground">
          {writing ? "Writing it now from your own lines. About half a minute." : "Rewritten from lines already on your resume. Nothing added."}
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-white px-5 py-5 text-[13.5px] leading-relaxed text-neutral-900 shadow-sm sm:px-7">
        {writing && !preview ? (
          <div className="flex flex-col gap-2.5" aria-hidden>
            {widths.slice(0, 5).map((w, i) => (
              <div key={i} className={cn("h-3 animate-pulse rounded-full bg-neutral-200", w)} />
            ))}
          </div>
        ) : preview ? (
          <>
            {preview.summary && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Summary</p>
                <p className="mt-1">{preview.summary}</p>
              </div>
            )}
            {preview.bullets.length > 0 && (
              <div className={preview.summary ? "mt-4" : ""}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Experience</p>
                <ul className="mt-1 list-disc pl-5">
                  {preview.bullets.map((b) => (
                    <li key={b.from}>{b.text}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex select-none flex-col gap-2 blur-[2px]" aria-hidden>
              {widths.map((w, i) => (
                <div key={i} className={cn("h-2.5 rounded-full bg-neutral-300/70", w)} />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
          </>
        ) : null}
      </div>
      {preview && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-foreground/85">
            The rest of it, plus the cover letter, a note to the hiring manager and interview prep for this job.
          </p>
          <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
            {signedIn ? (
              <Button onClick={onOpen} disabled={importing} className="gap-2">
                {importing ? <WorklyLoader className="size-4 animate-spin" /> : null}
                Write the whole application
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button asChild className="gap-2">
                <Link href="/signup?from=check">
                  Write the whole application
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <span className="text-center text-[11.5px] text-muted-foreground sm:text-right">
              {signedIn ? "Opens it in your account" : "Free account · your check comes with you"}
              {offer ? ` · founding members ${foundingSummary(offer, { forWhom: false })}` : ""}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
