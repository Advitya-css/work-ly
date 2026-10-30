import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  FileText,
  IdCard,
  MessagesSquare,
  PenLine,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBanner } from "@/components/marketing/founding-banner";
import { SaleBanner } from "@/components/marketing/sale-banner";
import { BUSINESS, GUARANTEE, RECOMMENDED_BADGE } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";
import { discountedPrice, type PublicFoundingOffer } from "@/lib/payments/founding-core";
import type { PublicSale } from "@/lib/payments/sale-core";
import { cn } from "@/lib/utils";

/**
 * THE LANDING PAGE, in the Linear / Vercel school: a dark stage, one sharp
 * headline, the product itself as the hero image, then three plain claims
 * each shown rather than told.
 *
 * Everything shown is true of the shipped product. The fit rows are copied
 * from a real report (a public listing checked against a sample resume, see
 * marketing/sample-report.tsx); the rewritten resume lines are labelled as
 * an example of the rewrite. No logos, user counts or testimonials we don't
 * have.
 */

const SECTION = "mx-auto w-full max-w-6xl px-5 sm:px-8";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">{children}</p>;
}

// ---------------------------------------------------------------------------
// Hero

export function LandingHero({ offer, sale }: { offer: PublicFoundingOffer | null; sale: PublicSale | null }) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* The stage: a faint grid fading out, and the plum glow behind the headline. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[-260px] -z-10 h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--glow)/0.45),transparent)] blur-2xl"
      />

      <div className={cn(SECTION, "flex flex-col items-center pt-20 text-center sm:pt-28")}>
        {sale ? (
          <SaleBanner sale={sale} className="mb-8" />
        ) : offer ? (
          <FoundingBanner offer={offer} className="mb-8" />
        ) : (
          <Link
            href="/linkedin-headline-generator"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-3 text-[13px] text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="rounded-full bg-primary-solid px-2 py-0.5 text-[11px] font-medium text-primary-solid-foreground">New</span>
            Free LinkedIn headline generator
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}

        <h1 className="max-w-4xl text-balance bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-transparent sm:text-[72px]">
          Every application, written for the job.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
          Work-ly reads the job, tells you honestly where you stand, then rewrites your real experience in its language:
          resume, cover letter, LinkedIn and interview prep. Nothing invented.
        </p>
        <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" className="h-11 w-full px-6 sm:w-auto">
            <Link href="/free-grader">
              Check a job free
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-11 w-full px-5 text-muted-foreground sm:w-auto">
            <Link href="/signup">Create a free account</Link>
          </Button>
        </div>
        <p className="mt-4 font-mono text-[12px] text-muted-foreground/80">No card needed · first check without an account</p>
      </div>

      <div className={cn(SECTION, "mt-16 pb-24 sm:mt-20")}>
        <ProductWindow />
        <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-xs text-muted-foreground">
          The fit rows are from a real report: a public listing checked against a sample resume, employer names withheld.
          The tailored lines show the kind of rewrite Pro makes.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The product, framed

const FIT_ROWS: { text: string; verdict: "met" | "partial" | "missing"; note: string }[] = [
  { text: "Proficiency in SQL, Python, data modeling and semantic layer", verdict: "met", note: "“Built 40+ dbt models on BigQuery…”" },
  { text: "Customer analytics KPIs across marketing, sales and service", verdict: "met", note: "“Designed and analysed A/B tests…”" },
  { text: "Expertise in Tableau, ideally certified", verdict: "partial", note: "Tableau dashboards for 3 clients; no certificate" },
  { text: "AWS data services (Athena, Glue, Redshift)", verdict: "missing", note: "To close it: a small Redshift + Athena project" },
];

const VERDICT_ICON = {
  met: { icon: CheckCircle2, tone: "text-success" },
  partial: { icon: CircleDashed, tone: "text-warning" },
  missing: { icon: CircleSlash, tone: "text-destructive" },
} as const;

function ScoreRing({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 72 72" className="size-[72px] -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} className="stroke-success" />
    </svg>
  );
}

function ProductWindow() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div aria-hidden className="absolute -inset-x-10 -bottom-10 top-10 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgb(var(--glow)/0.35),transparent)] blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[0_0_0_1px_rgb(255_255_255/0.02),0_30px_80px_-20px_rgb(0_0_0/0.6)]">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/10" />
          </div>
          <p className="truncate font-mono text-[11.5px] text-muted-foreground">work-ly.in / jobs / data-analytics-engineer</p>
        </div>

        <div className="grid text-left lg:grid-cols-[1.25fr_1fr]">
          {/* Fit */}
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ScoreRing value={71} />
                <span className="absolute inset-0 flex items-center justify-center font-mono text-xl font-medium text-foreground">71</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">Data &amp; Analytics Engineer · Bangalore</p>
                <p className="text-lg font-semibold tracking-tight text-foreground">Worth applying</p>
                <p className="text-[13px] text-muted-foreground">2 must-haves shown, 1 partly, 1 to close</p>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {FIT_ROWS.map((row) => {
                const v = VERDICT_ICON[row.verdict];
                return (
                  <li key={row.text} className="flex gap-3 px-4 py-3">
                    <v.icon className={cn("mt-0.5 size-4 shrink-0", v.tone)} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[13.5px] leading-snug text-foreground">{row.text}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{row.note}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Tailored resume */}
          <div className="border-t border-border bg-muted/30 p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground">Tailored resume</p>
              <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">PDF · Word</span>
            </div>
            <div className="rounded-lg bg-white p-5 text-neutral-900 shadow-sm">
              <p className="text-[15px] font-semibold tracking-tight">Priya Sharma</p>
              <p className="text-[11px] text-neutral-500">Data Analyst · Bengaluru</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Experience</p>
              <ul className="mt-1.5 flex flex-col gap-2.5 text-[12px] leading-snug">
                <li>
                  Built 40+ dbt data models on BigQuery powering delivery-operations dashboards for 120 city managers.
                  <span className="mt-0.5 block text-[10.5px] text-neutral-400">Was: Built 40+ dbt models on BigQuery that power…</span>
                </li>
                <li>
                  Designed and analysed checkout A/B tests; one lifted order conversion by 3.2%.
                  <span className="mt-0.5 block text-[10.5px] text-neutral-400">Was: Designed and analysed A/B tests for checkout changes, including one…</span>
                </li>
                <li className="text-neutral-400">Delivered Power BI and Tableau dashboards for 3 retail and banking clients.</li>
              </ul>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
              {[
                ["2", "rewritten"],
                ["1", "kept"],
                ["0", "invented"],
              ].map(([n, label]) => (
                <div key={label} className="bg-card px-2 py-2.5">
                  <p className="font-mono text-base text-foreground">{n}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Three claims, each shown

function FeatureRow({
  eyebrow,
  title,
  body,
  points,
  visual,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", flip && "lg:[&>*:first-child]:order-2")}>
      <div className="flex flex-col gap-4">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-4xl">{title}</h2>
        <p className="max-w-lg text-[16px] leading-relaxed text-muted-foreground">{body}</p>
        <ul className="mt-2 flex flex-col gap-2.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[14.5px] text-foreground/90">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div>{visual}</div>
    </div>
  );
}

function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.6)] sm:p-6", className)}>{children}</div>;
}

export function LandingFeatures() {
  return (
    <section id="how-it-works" className={cn(SECTION, "flex scroll-mt-20 flex-col gap-28 py-24 sm:gap-36 sm:py-32")}>
      <FeatureRow
        eyebrow="01 · The honest verdict"
        title="Know if you're a fit before you spend an evening applying."
        body="Paste any job. Work-ly checks it requirement by requirement against your resume, and only counts what it can quote."
        points={["A verdict and a score that explains itself", "The exact line on your resume behind every tick", "What to do about each gap, in one sentence"]}
        visual={
          <Surface>
            <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Requirement check</p>
            <ul className="mt-4 flex flex-col gap-4">
              {FIT_ROWS.slice(0, 3).map((row) => {
                const v = VERDICT_ICON[row.verdict];
                return (
                  <li key={row.text} className="flex gap-3">
                    <v.icon className={cn("mt-0.5 size-4 shrink-0", v.tone)} aria-hidden />
                    <div>
                      <p className="text-[14px] text-foreground">{row.text}</p>
                      <p className="mt-1 border-l-2 border-border pl-3 text-[13px] text-muted-foreground">{row.note}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Surface>
        }
      />

      <FeatureRow
        flip
        eyebrow="02 · The rewrite"
        title="A resume for every job, with every change shown."
        body="Pro picks your most relevant lines, rewrites them in the job's language and keeps every real number. Switch on your original lines to see exactly what changed."
        points={["Three ATS-safe layouts, PDF or Word", "Edits save as you type", "New wording flagged so you can check it's true"]}
        visual={
          <Surface className="bg-muted/30">
            <div className="rounded-lg bg-white p-5 text-neutral-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Experience · Data Analyst, QuickBite</p>
              <ul className="mt-2 flex flex-col gap-3 text-[13px] leading-snug">
                <li>
                  Built 40+ dbt data models on BigQuery powering delivery-operations dashboards for 120 city managers.
                  <span className="mt-1 block text-[11px] text-neutral-400">Was: Built 40+ dbt models on BigQuery that power the delivery-ops dashboards…</span>
                </li>
                <li>
                  Automated weekly reporting in Python, saving the ops team 6 hours a week.
                  <span className="mt-1 block text-[11px] text-emerald-700">Kept as written: already strong for this job</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-[13px]">
              <span className="text-foreground">Show my original lines</span>
              <span className="relative h-5 w-9 rounded-full bg-primary" aria-hidden>
                <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white" />
              </span>
            </div>
          </Surface>
        }
      />

      <FeatureRow
        eyebrow="03 · Everything else the job asks for"
        title="The letter, the note, the questions, the profile."
        body="Each one is written from your real experience for that specific job, saved, and yours to edit."
        points={["Cover letters as PDF or Word", "A LinkedIn request under 300 characters", "Interview questions with the line to answer from"]}
        visual={
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: PenLine, title: "Cover letter", body: "Opens with what the team needs, then your two strongest proofs." },
              { icon: UserPlus, title: "Note to the hiring manager", body: "An email and a LinkedIn request, plus who to send it to." },
              { icon: MessagesSquare, title: "Likely interview questions", body: "Why they'll ask, and the line from your history to answer from." },
              { icon: IdCard, title: "LinkedIn makeover", body: "Three headlines, an About section and the five skills to pin." },
            ].map((t) => (
              <Surface key={t.title} className="p-5 sm:p-5">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                  <t.icon className="size-4" aria-hidden />
                </span>
                <p className="mt-4 text-[14.5px] font-medium text-foreground">{t.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
              </Surface>
            ))}
          </div>
        }
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Principles + founder

const PRINCIPLES = [
  { title: "Quotes, not guesses", body: "A requirement only counts when Work-ly can quote the line on your resume that proves it." },
  { title: "Nothing invented", body: "No skills, numbers or titles you don't have. Anything new is flagged for you to check." },
  { title: "Your data stays yours", body: "Built on Google Gemini's paid API, which doesn't train on what you send. Delete everything any time." },
];

export function LandingPrinciples() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className={cn(SECTION, "py-20 sm:py-24")}>
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          <Eyebrow>Honest by design</Eyebrow>
        </div>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="bg-background p-6 sm:p-7">
              <p className="text-[15px] font-medium text-foreground">{p.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        <figure className="mx-auto mt-16 max-w-3xl text-center">
          <blockquote className="text-balance text-xl leading-relaxed tracking-[-0.01em] text-foreground sm:text-2xl">
            &ldquo;I built Work-ly after watching friends and family send hundreds of applications and hear nothing back. No
            reply, and no reason why. Work-ly tells you why before you apply, using only what&apos;s really on your
            resume.&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm text-muted-foreground">{BUSINESS.operator}, founder</figcaption>
        </figure>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing teaser + final call

export function LandingPricing({ offer }: { offer: PublicFoundingOffer | null }) {
  return (
    <section className={cn(SECTION, "py-24 sm:py-32")}>
      <div className="flex flex-col items-center text-center">
        <Eyebrow>Pricing</Eyebrow>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">Free to check. Pro when you apply.</h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          The fit check and the free tools stay free. Pro writes everything for every job you apply to.
        </p>
      </div>
      <div className="mx-auto mt-12 grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
        {PAID_PLANS.map((plan) => {
          const price = offer ? discountedPrice(plan.priceUsd, offer.percentOff) : plan.price;
          return (
            <div key={plan.interval} className={cn("flex flex-col gap-4 bg-background p-7", plan.featured && "bg-card")}>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium text-foreground">{plan.name}</p>
                {plan.featured && <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-primary">{RECOMMENDED_BADGE}</span>}
              </div>
              <p className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">{price}</span>
                {offer && <span className="text-sm tabular-nums text-muted-foreground line-through">{plan.price}</span>}
                {plan.priceSuffix && <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>}
              </p>
              <p className="text-[13px] text-muted-foreground">{plan.terms}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex flex-col items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/pricing">
            Compare plans
            <ArrowRight />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">{GUARANTEE.sentence}.</p>
      </div>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border">
      <div aria-hidden className="absolute left-1/2 top-full -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--glow)/0.5),transparent)] blur-2xl" />
      <div className={cn(SECTION, "flex flex-col items-center py-24 text-center sm:py-32")}>
        <h2 className="max-w-3xl text-balance bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-transparent sm:text-6xl">
          Check the next job before you apply.
        </h2>
        <p className="mt-5 max-w-lg text-muted-foreground">Free, and your first check needs no account.</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="/free-grader">
              Check a job free
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-11 text-muted-foreground">
            <Link href="/resume-bullet-point-generator">
              <FileText />
              Try the bullet rewriter
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
