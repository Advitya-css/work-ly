import { CheckCircle2, CircleDashed, CircleSlash } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A REAL SAMPLE, NOT A MOCKUP.
 *
 * An excerpt of the Fit report Work-ly produced on 26 Sep 2026 for a real
 * public listing (Data & Analytics Engineer, a consulting firm in
 * Bangalore, found through Adzuna) against a sample resume (a test profile). The
 * requirements, verdicts, quotes and "to close it" advice are copied from
 * that report; only the employers' names are withheld. Replace it with a
 * newer real run rather than editing the wording by hand.
 */

type Verdict = "met" | "partial" | "missing";

const ROWS: { requirement: string; verdict: Verdict; evidence?: string; from?: string; toClose?: string }[] = [
  {
    requirement: "Proficiency in SQL, Python, data modeling and semantic layer",
    verdict: "met",
    evidence: "Built 40+ dbt models on BigQuery that power the delivery-ops dashboards used by 120 city managers.",
    from: "Data Analyst, food-delivery app",
  },
  {
    requirement: "Knowledge of customer analytics KPIs across marketing, digital, sales and service",
    verdict: "met",
    evidence: "Designed and analysed A/B tests for checkout changes, including one that lifted order conversion by 3.2%.",
    from: "Data Analyst, food-delivery app",
  },
  {
    requirement: "Expertise in Tableau, ideally certified",
    verdict: "partial",
    evidence: "Delivered Power BI and Tableau dashboards for 3 retail and banking clients.",
    from: "Business Analyst, consulting firm",
    toClose: "Obtain Tableau Certified Data Analyst certification and document complex dashboard design projects.",
  },
  {
    requirement: "Working knowledge of AWS data services (Athena, Glue, Redshift)",
    verdict: "missing",
    toClose: "Build a portfolio pipeline loading and querying data in AWS Redshift and Athena.",
  },
];

const VERDICT = {
  met: { label: "Shown", icon: CheckCircle2, tone: "text-success" },
  partial: { label: "Partly shown", icon: CircleDashed, tone: "text-warning" },
  missing: { label: "Not shown yet", icon: CircleSlash, tone: "text-destructive" },
} as const;

export function SampleReport() {
  return (
    <figure className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-xl shadow-black/5">
        <div className="flex flex-col gap-4 border-b border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sample Fit report</p>
            <p className="mt-1 font-semibold text-foreground">Data &amp; Analytics Engineer</p>
            <p className="text-sm text-muted-foreground">Consulting firm · Bangalore · real public listing</p>
          </div>
          <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              71<span className="text-base font-medium text-muted-foreground">/100</span>
            </p>
            <p className="text-xs text-muted-foreground">Candidate Fit · Apply</p>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {ROWS.map((row) => {
            const v = VERDICT[row.verdict];
            return (
              <li key={row.requirement} className="flex gap-3 px-5 py-4">
                <v.icon className={cn("mt-0.5 size-4 shrink-0", v.tone)} aria-hidden />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {row.requirement}
                    <span className={cn("ml-2 whitespace-nowrap text-xs font-semibold", v.tone)}>{v.label}</span>
                  </p>
                  {row.evidence && (
                    <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{row.evidence}&rdquo;
                      {row.from && <span className="mt-0.5 block text-xs">{row.from}</span>}
                    </blockquote>
                  )}
                  {row.toClose && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">To close it: </span>
                      {row.toClose}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground text-balance">
        An excerpt of a real report: a public job listing checked against a sample resume. Employer names
        withheld. Every quote comes from the resume itself.
      </figcaption>
    </figure>
  );
}
