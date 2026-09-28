import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Handshake, KeyRound, Lock } from "lucide-react";

import { BuyForm } from "@/components/offers/buy-form";
import { BUSINESS } from "@/lib/business";
import { OFFERS, perSeat } from "@/lib/payments/offers";
import { PAID_PLANS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Work-ly for career coaches",
  description: `Give every client Work-ly Pro between sessions: ${OFFERS.coach.seats} seats for 3 months, ${OFFERS.coach.price}. One code, redeemed by each client on their own account.`,
};

const coach = OFFERS.coach;

const STEPS = [
  { title: "Buy the pack", body: "You get one code by email straight away, good for 10 people." },
  { title: "Share it with clients", body: "Each client redeems it on their own Work-ly account and gets 3 months of Pro." },
  { title: "Coach on what matters", body: "They check every posting and tailor every application between sessions; you spend your time on strategy." },
];

const FAQ = [
  {
    q: "What does a client actually do with it?",
    a: "They paste a job posting and see a Candidate Fit score out of 100, requirement by requirement, with the gaps that could get them screened out. Then Pro rewrites their resume and cover letter for that posting and preps them for the interview.",
  },
  {
    q: "Will it invent experience for my clients?",
    a: "No. Everything is built only from what's already on their resume. Gaps are shown honestly, never covered with made-up skills.",
  },
  {
    q: "Can I see my clients' resumes or results?",
    a: "No. Each client's account is private to them. You can ask me at any time how many of your seats have been used.",
  },
  {
    q: "When do the 3 months start?",
    a: "For each client, on the day they redeem the code - so you can hand seats out over time.",
  },
  {
    q: "Need an invoice?",
    a: `Every order comes with an invoice from ${BUSINESS.paymentProvider}, our payment provider and Merchant of Record.`,
  },
];

export default async function ForCoachesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const pass = PAID_PLANS.find((p) => p.interval === "quarterly");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16">
      <header className="grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">For career coaches</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            A tool for your clients, for the hours between your sessions
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Your clients paste a posting and see how they fit it, what could get them screened out, and a resume tailored to
            that job - using only what&apos;s already true about them.
          </p>
          <p className="text-sm text-muted-foreground">
            Want to try it yourself first? Email{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}?subject=Coach%20trial`}>
              {BUSINESS.supportEmail}
            </a>{" "}
            and I&apos;ll send you a free 3-Month Pass to test on a real posting.
          </p>
        </div>

        <aside id="buy" className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-foreground">{coach.name}</p>
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">{coach.price}</span>
              <span className="text-sm text-muted-foreground">one payment</span>
            </p>
            <p className="text-sm font-medium text-primary">
              {perSeat(coach)}
              {pass ? `, half the ${pass.price} 3-Month Pass` : ""}
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {coach.seats} seats on one code
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {coach.months} months of Pro per client, from the day they redeem
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Each client&apos;s account stays private to them
            </li>
          </ul>
          <BuyForm offer="coach" error={error} />
          <p className="text-xs text-muted-foreground">
            Full refund within 14 days if no one has redeemed the code yet.
          </p>
        </aside>
      </header>

      <section aria-labelledby="how" className="flex flex-col gap-5">
        <h2 id="how" className="text-2xl font-semibold tracking-tight text-foreground">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
              <span className="text-sm font-semibold text-primary">Step {i + 1}</span>
              <span className="font-medium text-foreground">{s.title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex gap-3 rounded-xl border border-border bg-card p-5">
        <Handshake className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-foreground">Rather recommend it than buy seats?</p>
          <p className="text-muted-foreground">
            Ask for a personal link and earn 30% of every purchase made by people who first come to Work-ly through it,
            paid monthly. Email{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}?subject=Partner%20link`}>
              {BUSINESS.supportEmail}
            </a>
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
          Running a bootcamp or a career centre? See{" "}
          <Link href="/for-teams" className="text-foreground underline underline-offset-2">
            Work-ly for cohorts
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
