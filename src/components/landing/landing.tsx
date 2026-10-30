import Link from "next/link";
import {
  ArrowRight,
  Check,
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
import { LiveCheck } from "@/components/landing/live-check";

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
          Apply to fewer jobs.
          <br />
          Get more yeses.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
          Paste a job and your resume. Work-ly tells you straight whether it&apos;s worth applying, and proves every point
          with a line from your own resume. If it&apos;s a yes, it writes the application. If it&apos;s a no, it says so.
        </p>
      </div>

      <div id="check" className={cn(SECTION, "mt-12 scroll-mt-24 pb-24 sm:mt-14")}>
        <LiveCheck />
        <p className="mt-4 text-center font-mono text-[12px] text-muted-foreground/80">
          Free · no account needed · one check per device without signing up
        </p>
      </div>
    </section>
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
        title="It will tell you not to apply."
        body="Most job tools earn more when you send more applications. Work-ly is built the other way: it checks every requirement against your resume, only counts what it can quote, and when a job isn't worth your evening, it says so."
        points={["Five verdicts, from apply now to skip", "The exact line on your resume behind every tick", "What to do about each gap, in one sentence"]}
        visual={
          <Surface>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Every job gets one of five</p>
            <ol className="mt-4 flex flex-col gap-2">
              {[
                { word: "Apply now", line: "A strong fit. Don't sit on it.", tone: "bg-success", text: "text-success" },
                { word: "Apply", line: "Worth your evening.", tone: "bg-success/60", text: "text-success" },
                { word: "Stretch", line: "Within reach after one fix.", tone: "bg-warning", text: "text-warning" },
                { word: "Probably not", line: "Your time is better spent elsewhere.", tone: "bg-warning/60", text: "text-warning" },
                { word: "Skip", line: "It asks for what your resume can't show.", tone: "bg-destructive", text: "text-destructive" },
              ].map((v) => (
                <li key={v.word} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3.5 py-2.5">
                  <span className={cn("h-6 w-1 rounded-full", v.tone)} aria-hidden />
                  <span className={cn("w-28 shrink-0 text-[14px] font-medium", v.text)}>{v.word}</span>
                  <span className="text-[13px] text-muted-foreground">{v.line}</span>
                </li>
              ))}
            </ol>
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
          Ask before you apply.
        </h2>
        <p className="mt-5 max-w-lg text-muted-foreground">One honest answer, proven line by line. Free, and your first check needs no account.</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="#check">
              Check a job now
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
