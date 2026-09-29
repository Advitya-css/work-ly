import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBanner } from "@/components/marketing/founding-banner";
import { SaleBanner } from "@/components/marketing/sale-banner";
import { getFoundingOffer } from "@/lib/payments/founding";
import { getSale } from "@/lib/payments/sale";
import { OFFERS } from "@/lib/payments/offers";
import { PAID_PLANS } from "@/lib/pricing";
import { getSprintSpots } from "@/lib/sprint";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Your Q1 job search",
  description:
    "Hiring slows in December and picks up in January. Use the quiet weeks to line up applications that fit - free check, a 3-Month Pass for January to March, or a Sprint that starts 2 January.",
};

const PREP = [
  "Pick one or two role families to aim at, not ten.",
  "Save ten real postings for those roles as you find them.",
  "Check each one against your resume: where's the proof for every requirement?",
  "Fix the gaps that keep coming up - with true experience, not keywords.",
  "Line up two references now, before everyone's back at work.",
];

export default async function NewYearPage() {
  const [founding, liveSale, spots] = await Promise.all([getFoundingOffer(), getSale(), getSprintSpots()]);
  const sale = liveSale ? (({ discountId: _omit, ...rest }) => rest)(liveSale) : null;
  const pass = PAID_PLANS.find((p) => p.interval === "quarterly")!;
  const sprint = OFFERS.sprint;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <CalendarDays className="size-4" aria-hidden />
          Your Q1 job search
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Start January with applications that already fit
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Hiring falls sharply in December and picks up again in January (
          <a
            href="https://fortune.com/2026/09/05/september-surge-hiring-jobs-linkedin-indeed/"
            className="underline underline-offset-2"
            target="_blank"
            rel="noopener"
          >
            Fortune, citing LinkedIn and Indeed data
          </a>
          ). The quiet weeks are the best time to get ready, so your first applications of the year are your best ones.
        </p>
        {sale ? <SaleBanner sale={sale} className="w-fit" /> : <FoundingBanner offer={founding} className="w-fit" />}
      </header>

      <section aria-label="Ways to start" className="grid gap-5 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Check a job, free</h2>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            Paste a posting and your resume: see requirement by requirement what you already prove, and what would get you
            screened out.
          </p>
          <Button asChild variant="outline">
            <Link href="/free-grader?utm_source=new-year&utm_campaign=q1">Check a job</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-primary bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-foreground">
            {pass.name} · {pass.price}
          </h2>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            Covers January to March: a tailored resume and cover letter for every job, interview practice, and new listings
            matched every night. One payment, nothing renews.
          </p>
          <Button asChild>
            <Link href="/upgrade?plan=quarterly">
              Get the {pass.name}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">
            {sprint.name} · {sprint.price}
          </h2>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
            Five applications checked with you by a person in 14 days, plus 3 months of Pro. Your 14 days start when you send
            the intake form - on 2 January if you like.{" "}
            {spots.open > 0 ? `${spots.open} of ${spots.capacity} spots open now.` : "Every spot is taken right now."}
          </p>
          <Button asChild variant="outline">
            <Link href="/sprint">See the Sprint</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="prep" className="flex flex-col gap-4">
        <h2 id="prep" className="text-2xl font-semibold tracking-tight text-foreground">
          A December checklist
        </h2>
        <ul className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {PREP.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Buying for someone else? <Link href="/gift" className="text-foreground underline underline-offset-2">Gift a 3-Month Pass</Link> - it starts
          when they redeem it.
        </p>
      </section>
    </div>
  );
}
