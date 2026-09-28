import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";

import { BuyForm } from "@/components/offers/buy-form";
import { BUSINESS } from "@/lib/business";
import { OFFERS, perSeat } from "@/lib/payments/offers";

export const metadata: Metadata = {
  title: "Work-ly for cohorts",
  description: `Work-ly Pro for a bootcamp, career centre or outplacement cohort: a ${OFFERS.pilot.seats}-seat pilot for ${OFFERS.pilot.price} or ${OFFERS.licence.seats} seats for a term for ${OFFERS.licence.price}.`,
};

const pilot = OFFERS.pilot;
const licence = OFFERS.licence;

const TERMS = [
  { term: "Seats and length", pilot: `${pilot.seats} seats, ${pilot.months} months each`, licence: `${licence.seats} seats, ${licence.months} months each` },
  { term: "Price", pilot: `${pilot.price} (${perSeat(pilot)})`, licence: `${licence.price} (${perSeat(licence)})` },
  { term: "Onboarding", pilot: "A call with you, and a welcome note for your students", licence: "The same, plus one live 30-minute workshop for the cohort" },
  { term: "Reporting", pilot: "A usage report at week 6: seats used, checks run, resumes tailored - totals only", licence: "A usage report at week 6 and at the end of term" },
  {
    term: "Your safety net",
    pilot: "Full refund if fewer than 10 of the 25 seats are used in the first 30 days",
    licence: "Full refund within 14 days if no seat has been used",
  },
  { term: "Moving up", pilot: `Sign a licence within 60 days and your pilot students keep Pro for ${pilot.months} more months`, licence: "-" },
];

const FAQ = [
  {
    q: "What do students actually get?",
    a: "Work-ly Pro on their own account: a Candidate Fit score for any posting, the gaps that matter, a resume and cover letter tailored to each job from their real experience only, interview practice, and new listings matched every night.",
  },
  {
    q: "Do we see students' data?",
    a: "No. Each account is private to the student, and they can delete it at any time. You get totals only - how many seats are in use and how much they're being used.",
  },
  {
    q: "Can Work-ly promise placements?",
    a: "No, and we won't claim it. Work-ly helps each student send stronger, better-targeted applications; the scores describe how a profile matches a posting's stated requirements, not a chance of being hired.",
  },
  {
    q: "Invoices, purchase orders, paying before year end?",
    a: `Every order comes with an invoice from ${BUSINESS.paymentProvider}, our Merchant of Record. Need a purchase order, a quote, or to pay this year for a January start? Email me.`,
  },
];

export default async function ForTeamsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">For bootcamps, career centres and outplacement</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Every student checks every application before it goes out
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Your career team can&apos;t read every application. Work-ly gives each student a fit check against the actual
          posting and a resume tailored to it - built only from what&apos;s true about them.
        </p>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            One code for the whole cohort; each student redeems it on their own account
          </li>
          <li className="flex items-start gap-2.5">
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Usage reports with totals only - never a student&apos;s private data
          </li>
          <li className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Want to see it first?{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}?subject=Work-ly%20for%20our%20cohort`}>
              Book a 15-minute demo
            </a>{" "}
            on a posting your students care about.
          </li>
        </ul>
      </header>

      <section id="buy" aria-label="Plans" className="grid scroll-mt-24 gap-6 md:grid-cols-2">
        {[pilot, licence].map((o) => (
          <div key={o.key} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-foreground">{o.name}</h2>
              <p className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight tabular-nums">{o.price}</span>
                <span className="text-sm text-muted-foreground">one payment</span>
              </p>
              <p className="text-sm font-medium text-primary">{perSeat(o)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{o.summary}.</p>
            </div>
            <BuyForm offer={o.key} error={error} className="mt-auto" />
          </div>
        ))}
      </section>

      <section aria-labelledby="terms" className="flex flex-col gap-4">
        <h2 id="terms" className="text-2xl font-semibold tracking-tight text-foreground">
          The terms, side by side
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="p-4 font-medium" scope="col"><span className="sr-only">Term</span></th>
                <th className="p-4 font-medium text-foreground" scope="col">{pilot.name}</th>
                <th className="p-4 font-medium text-foreground" scope="col">{licence.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TERMS.map((t) => (
                <tr key={t.term}>
                  <th scope="row" className="p-4 font-medium text-foreground">{t.term}</th>
                  <td className="p-4 text-muted-foreground">{t.pilot}</td>
                  <td className="p-4 text-muted-foreground">{t.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          The refund terms are in our{" "}
          <Link href="/legal/refunds" className="text-foreground underline underline-offset-2">
            Refund policy
          </Link>
          .
        </p>
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
          An independent coach? The{" "}
          <Link href="/for-coaches" className="text-foreground underline underline-offset-2">
            Coach pack
          </Link>{" "}
          is 10 seats for {OFFERS.coach.price}.
        </p>
      </section>
    </div>
  );
}
