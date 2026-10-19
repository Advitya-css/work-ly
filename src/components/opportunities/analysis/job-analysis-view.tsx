import type { ReactNode } from "react";
import { CheckCircle2, ChevronDown, CircleDashed, ExternalLink, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/opportunities/analysis/score-ring";
import { placeLine } from "@/lib/places";
import { formatSalaryRange, displayJobTitle } from "@/lib/format";
import { coverageOf, MIN_COVERAGE_FOR_SCORE, roundForDisplay, unassessedIn } from "@/lib/scoring/coverage";
import {
  EMPLOYMENT_TYPE_LABEL,
  PRIORITY_COMPONENT_LABEL,
  PRIORITY_COMPONENT_ORDER,
  RECOMMENDATION_LABEL,
  RECOMMENDATION_VARIANT,
  SCORE_COMPONENT_LABEL,
  SCORE_COMPONENT_ORDER,
  SENIORITY_LABEL,
  WORK_MODE_LABEL,
} from "@/lib/jobs/labels";
import { cn } from "@/lib/utils";
import type { Job, JobAnalysis, PriorityBreakdown, RequirementCheck, ScoreBreakdown, ScoreComponent } from "@/lib/db/types";

/**
 * THE JOB ANALYSIS PAGE, shared by a tracked opportunity and a one-off
 * analysis. Built to be read top to bottom in under a minute:
 *
 *   1. the verdict (fit, what to do, why) in one panel,
 *   2. the next step (the tools for this job) right under it,
 *   3. the requirements as one checklist with the proof for each,
 *   4. what to do before applying,
 *
 * and everything else (how the score is built, the full posting) folded
 * away until asked for. It used to be eleven cards of equal weight.
 */

export interface JobAnalysisViewProps {
  job: Job;
  analysis: JobAnalysis;
  /** Opportunity extras, when this job is tracked. */
  priority?: { score: number; breakdown: PriorityBreakdown | null } | null;
  /** Top-right controls: save, status, delete. */
  actions?: ReactNode;
  /** A small status pill next to the title. */
  statusBadge?: ReactNode;
  /** The tools / upgrade panel, placed right under the verdict. */
  nextStep?: ReactNode;
  backLink?: ReactNode;
}

export function JobAnalysisView({ job, analysis, priority, actions, statusBadge, nextStep, backLink }: JobAnalysisViewProps) {
  const fitBreakdown = analysis.scoreBreakdown as ScoreBreakdown;
  const coverage = coverageOf(fitBreakdown);
  const reliable = coverage >= MIN_COVERAGE_FOR_SCORE;
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const place = placeLine(job.location, job.country);
  const meta = [
    job.company,
    place || null,
    job.workMode ? WORK_MODE_LABEL[job.workMode] : null,
    job.seniority ? SENIORITY_LABEL[job.seniority] : null,
    salary,
  ].filter(Boolean) as string[];

  const must = analysis.mandatoryRequirements;
  const nice = analysis.preferredRequirements;
  const mustMet = must.filter((r) => r.status === "met").length;
  const mustKnown = must.filter((r) => r.status !== "unknown").length;

  const todo = beforeYouApply(analysis);

  return (
    <div className="flex flex-col gap-6">
      {(backLink || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>{backLink}</div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      )}

      {/* Title */}
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">{displayJobTitle(job.title)}</h1>
          {statusBadge}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {meta.map((m, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-border">•</span>}
              {m}
            </span>
          ))}
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              View posting
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </p>
      </header>

      {/* Verdict */}
      <section aria-label="Verdict" className="grid gap-6 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <ScoreRing value={reliable ? analysis.fitScore : null} />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={RECOMMENDATION_VARIANT[analysis.recommendation]}>{RECOMMENDATION_LABEL[analysis.recommendation]}</Badge>
            {reliable && coverage < 1 && (
              <span className="text-xs text-muted-foreground">Based on {Math.round(coverage * 100)}% of the criteria</span>
            )}
          </div>
          {reliable ? (
            <>
              <p className="text-xl font-semibold tracking-tight text-balance text-foreground">{VERDICT_HEADLINE[analysis.recommendation]}</p>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{analysis.recommendationReasoning}</p>
            </>
          ) : (
            <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
              Not enough to score this fairly: Work-ly could check only {Math.round(coverage * 100)}% of what matters
              {unassessedIn(fitBreakdown).length > 0 ? ` (missing: ${unassessedIn(fitBreakdown).map(humanize).join(", ")})` : ""}. Add
              more to your profile, or paste the full posting.
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-border pt-4 text-center md:w-72 md:grid-cols-1 md:gap-3 md:border-l md:border-t-0 md:pl-6 md:pt-0 md:text-left">
          {must.length > 0 && (
            <Stat label="Must-haves met" value={`${mustMet} of ${mustKnown || must.length}`} />
          )}
          {priority && <Stat label="Priority" value={`${priority.score}/100`} hint="Worth your time, beyond fit" />}
          {analysis.competitiveness !== "Insufficient data" && (
            <Stat label="Your standing" value={analysis.competitiveness} />
          )}
        </dl>
      </section>

      {nextStep}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Requirements */}
          <Panel
            title="Requirements"
            aside={must.length > 0 ? `${mustMet} of ${must.length} must-haves shown on your profile` : undefined}
          >
            {must.length === 0 && nice.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clear requirements were found in this posting.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {must.length > 0 && <RequirementList title="Must-have" items={must} strict />}
                {nice.length > 0 && <RequirementList title="Nice to have" items={nice} />}
              </div>
            )}
          </Panel>

          {analysis.strengths.length > 0 && (
            <Panel title="What works in your favour">
              <ul className="flex flex-col gap-2.5">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {todo.length > 0 && (
            <Panel title="Before you apply">
              <ol className="flex flex-col gap-3">
                {todo.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{item.title}</span>
                      {item.detail && <span className="text-muted-foreground">{item.detail}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="About the job">
            <dl className="flex flex-col gap-2 text-sm">
              {job.company && <Fact label="Company" value={job.company} />}
              {place && <Fact label="Location" value={place} />}
              {job.workMode && <Fact label="Work mode" value={WORK_MODE_LABEL[job.workMode]} />}
              {job.employmentType && <Fact label="Type" value={EMPLOYMENT_TYPE_LABEL[job.employmentType]} />}
              {job.seniority && <Fact label="Level" value={SENIORITY_LABEL[job.seniority]} />}
              {salary && <Fact label="Salary" value={salary} />}
              {job.requiredExperienceYears ? <Fact label="Experience" value={`${job.requiredExperienceYears}+ years`} /> : null}
              {job.deadline && <Fact label="Apply by" value={new Date(job.deadline).toLocaleDateString()} />}
              {job.datePosted && <Fact label="Posted" value={new Date(job.datePosted).toLocaleDateString()} />}
            </dl>
          </Panel>

          <Fold title="How the score is worked out">
            <div className="flex flex-col gap-5">
              <Breakdown title="Candidate fit" order={SCORE_COMPONENT_ORDER} labels={SCORE_COMPONENT_LABEL} data={fitBreakdown} />
              {priority?.breakdown && (
                <Breakdown
                  title="Priority"
                  order={PRIORITY_COMPONENT_ORDER}
                  labels={PRIORITY_COMPONENT_LABEL}
                  data={priority.breakdown}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Fit is how much of this job your profile proves. It isn&apos;t a prediction of being hired.
              </p>
            </div>
          </Fold>

          {job.description && (
            <Fold title="Full job description">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.description}</p>
            </Fold>
          )}
        </div>
      </div>
    </div>
  );
}

const VERDICT_HEADLINE: Record<string, string> = {
  APPLY_NOW: "Apply now: you're a strong fit",
  APPLY: "Worth applying",
  STRETCH: "A stretch, but within reach",
  LOW_PRIORITY: "Probably not the best use of your time",
  SKIP: "Skip this one",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5" title={hint}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function Panel({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {aside && <p className="text-xs text-muted-foreground">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border px-5 py-4">{children}</div>
    </details>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function RequirementList({ title, items, strict = false }: { title: string; items: RequirementCheck[]; strict?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {items.map((req, i) => (
          <li key={i} className="flex items-start gap-3 px-3 py-2.5 text-sm">
            {req.status === "met" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Shown on your profile" />
            ) : req.status === "not-met" ? (
              <XCircle
                className={cn("mt-0.5 size-4 shrink-0", strict ? "text-destructive" : "text-muted-foreground")}
                aria-label="Not shown on your profile"
              />
            ) : (
              /* Unknown is not a failure: never drawn as a red cross. */
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Couldn't check" />
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-foreground">{req.text}</span>
              {req.detail && <span className="text-xs text-muted-foreground">{tidyDetail(req.detail)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Breakdown<K extends string>({
  title,
  order,
  labels,
  data,
}: {
  title: string;
  order: readonly K[];
  labels: Record<K, string>;
  data: Partial<Record<K, ScoreComponent>>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {order.map((key) => {
        const c = data[key];
        if (!c) return null;
        const unscored = c.confidence === "unavailable";
        const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0;
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{labels[key]}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {unscored ? "Not scored" : `${roundForDisplay(c.score)} / ${c.maxScore}`}
              </span>
            </div>
            {!unscored && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">{c.reasoning}</p>
          </div>
        );
      })}
    </div>
  );
}

/** "Matched to "Python" on your profile." -> "Matched to "Python" on your profile" (no leading comma/space noise). */
function tidyDetail(detail: string): string {
  return detail.replace(/^[,;\s]+/, "").replace(/^\w/, (c) => c.toUpperCase());
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
}

/**
 * One short to-do list from what used to be three separate cards (gaps,
 * risks, improvements), with near-duplicates dropped: the same missing
 * requirement used to appear in all three.
 */
export function beforeYouApply(analysis: Pick<JobAnalysis, "gaps" | "improvements" | "risks">): { title: string; detail?: string }[] {
  const out: { title: string; detail?: string }[] = [];
  const seen: string[] = [];
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const isDup = (s: string) => {
    const k = key(s);
    return seen.some((x) => x.includes(k) || k.includes(x) || overlap(x, k) >= 0.45);
  };
  const push = (title: string, detail?: string) => {
    const basis = `${title} ${detail ?? ""}`;
    if (!title.trim() || isDup(basis) || isDup(title) || (detail && isDup(detail))) return;
    seen.push(key(basis), key(title), ...(detail ? [key(detail)] : []));
    out.push({ title, detail });
  };
  for (const g of analysis.gaps) push(g.title, g.description);
  // Notes about the analysis itself ("could not assess 3 parts") are shown
  // as the coverage line in the verdict, and a risk that just counts unmet
  // requirements repeats the checklist: neither is a to-do.
  for (const imp of analysis.improvements) if (!/could(n['’]t| not) assess/i.test(imp)) push(imp);
  for (const r of analysis.risks) if (!/^\d+ (mandatory|required) requirements?\b/i.test(r)) push(r);
  return out.slice(0, 5);
}

function overlap(a: string, b: string): number {
  const A = new Set(a.split(" ").filter((w) => w.length > 3));
  const B = new Set(b.split(" ").filter((w) => w.length > 3));
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
