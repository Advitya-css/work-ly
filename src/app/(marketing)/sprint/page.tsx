import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";

import { BuyForm } from "@/components/offers/buy-form";
import { getCurrentUser } from "@/lib/auth";
import { BUSINESS } from "@/lib/business";
import { OFFERS } from "@/lib/payments/offers";
import { PAID_PLANS } from "@/lib/pricing";
import { getSprintSpots } from "@/lib/sprint";
import { SPRINT_DAYS } from "@/lib/sprint-core";

export const dynamic = "force-dynamic";

const sprint = OFFERS.sprint;

export const metadata: Metadata = {
  title: "Application Sprint",
  description: `Five job applications checked with you by a person in ${SPRINT_DAYS} days, plus 3 months of Work-ly Pro. ${sprint.price}, one payment.`,
};

const DAYS = [
  {
    when: "Day 0",
    what: "You fill in a short intake form: the roles you want, and up to five postings (or we pick them from your Work-ly matches).",
  },
  {
    when: "Days 1-2",
    what: "A personal review of your resume: your three strongest proof points, the three fixes that matter, and a rewritten summary.",
  },
  {
    when: "Days 2-10",
    what: "Five applications. Each gets a fit check, a tailored resume, a cover letter and one message to the hiring manager, and I read every one before it comes back to you.",
  },
  {
    when: "Day 7",
    what: "A 20-minute video call on what's working, with interview prep for any callback.",
  },
  {
    when: `Day ${SPRINT_DAYS}`,
    what: "A wrap-up note with what to apply to next. Your 3 months of Pro keep running.",
  },
];

const FAQ = [
  {
    q: "Who reads my applications?",
    a: `I do - ${BUSINESS.operator}, the founder of Work-ly. Work-ly's tools draft each piece; I review and edit it before it reaches you.`,
  },
  {
    q: "Do you apply for me?",
    a: "No. You stay in control: you get finished applications and you send them yourself, from your own accounts.",
  },
  {
    q: "Will you add skills to make me look better?",
    a: "Never. Everything uses only what's already true on your resume. Gaps are shown to you honestly, not hidden with invented experience.",
  },
  {
    q: "Can you promise interviews?",
    a: "No one honest can. The promise is five finished, carefully checked applications in 14 days - or your money back.",
  },
  {
    q: "What if I don't have five postings yet?",
    a: "Tell me the roles you want and we'll pick them together from your Work-ly matches.",
  },
];

export default async function SprintPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, user, spots] = await Promise.all([searchParams, getCurrentUser(), getSprintSpots()]);
  const pass = PAID_PLANS.find((p) => p.interval === "quarterly");
  const full = spots.open <= 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16">
      <header className="grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Application Sprint</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Five applications, checked with a person, in {SPRINT_DAYS} days
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            For when you need interviews soon - laid off, graduating, or switching field. You get Work-ly&apos;s tools, and
            me reading every application before it goes out.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Every application reviewed by {BUSINESS.operator}, the founder
            </li>
            <li className="flex items-start gap-2.5">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              A 20-minute call halfway through
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              3 months of Work-ly Pro included{pass ? ` (a ${pass.price} pass)` : ""}
            </li>
          </ul>
        </div>

        <aside id="buy" className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-3xl font-bold tracking-tight tabular-nums">{sprint.price}</p>
            <p className="text-sm text-muted-foreground">one payment</p>
          </div>
          <p className="text-sm font-medium text-foreground">
            {full
              ? "Every spot is taken right now."
              : `${spots.open} of ${spots.capacity} spots open now`}
          </p>
          <p className="text-xs text-muted-foreground">
            I run at most {spots.capacity || "a few"} Sprints at a time so each one gets full attention.
          </p>
          <BuyForm
            offer="sprint"
            error={error}
            label={user ? `Book my Sprint · ${sprint.price}` : `Sign in and book · ${sprint.price}`}
            disabled={full}
            disabledNote={full ? `Email ${BUSINESS.supportEmail} to be first in line for the next spot.` : undefined}
          />
        </aside>
      </header>

      <section aria-labelledby="days" className="flex flex-col gap-5">
        <h2 id="days" className="text-2xl font-semibold tracking-tight text-foreground">
          What happens, day by day
        </h2>
        <ol className="divide-y divide-border rounded-xl border border-border bg-card">
          {DAYS.map((d) => (
            <li key={d.when} className="grid gap-1 p-5 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <span className="text-sm font-semibold text-foreground">{d.when}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{d.what}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-foreground">The promise</p>
          <p className="text-muted-foreground">
            Five finished applications within {SPRINT_DAYS} days of your intake form, or a full refund. See the{" "}
            <Link href="/legal/refunds" className="underline underline-offset-2">
              Refund policy
            </Link>
            .
          </p>
        </div>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-4">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight text-foreground">
          Questions
        </h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {FAQ.map((f) => (
            <div key={f.q} className="flex flex-col gap-1.5 p-5">
              <h3 className="font-medium text-foreground">{f.q}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Rather do it on your own? <Link href="/pricing" className="text-foreground underline underline-offset-2">Work-ly Pro</Link>{" "}
          has every tool without the personal review.
        </p>
      </section>
    </div>
  );
}
