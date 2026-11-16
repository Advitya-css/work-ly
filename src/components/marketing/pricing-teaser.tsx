import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GUARANTEE } from "@/lib/business";
import { PAID_PLANS } from "@/lib/pricing";
import { foundingSummary, type PublicFoundingOffer } from "@/lib/payments/founding-core";

/**
 * The price, on the landing page, before anyone has to go looking for it:
 * what's free, what Pro adds, what it costs and how to get the money back.
 * Two columns, not the full plan table (that's /pricing).
 */

const FREE = [
  "The straight answer on any job, up to 15 checks a day",
  "Jobs that fit your resume, found for you",
  "The top of your tailored resume for 3 jobs a month",
  "A tracker for everything you apply to",
];

const PRO = [
  "The whole resume, rewritten for every job you apply to",
  "Cover letter and a note to the hiring manager, per job",
  "Likely interview questions and scored practice interviews",
  "Download as PDF or Word, edit anything, all saved",
];

export function PricingTeaser({ offer }: { offer: PublicFoundingOffer | null }) {
  const monthly = PAID_PLANS.find((p) => p.interval === "monthly");
  const pass = PAID_PLANS.find((p) => p.interval === "quarterly");
  if (!monthly || !pass) return null;

  return (
    <section aria-labelledby="price-heading" className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="price-heading" className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Free to find out. Pro when you&apos;re applying.
          </h2>
          <p className="mt-3 text-balance text-lg text-muted-foreground">
            Most people only need Pro for the weeks they&apos;re job hunting, so there&apos;s a pass for exactly that.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:p-7">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Free</h3>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">No card. Start with one check, no account.</p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FREE.map((f) => (
                <li key={f} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" size="lg" className="mt-auto">
              <Link href="#check">Check a job, free</Link>
            </Button>
          </div>

          <div className="relative flex flex-col gap-5 rounded-2xl border-2 border-primary bg-card p-6 shadow-[0_24px_60px_-30px_rgb(122_46_85/0.5)] sm:p-7">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Pro</h3>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-foreground">
                <span className="text-3xl font-semibold tracking-tight">{pass.price}</span>
                <span className="text-sm text-muted-foreground">for 3 months, paid once</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                or {monthly.price} a month, cancel anytime
              </p>
              {offer && (
                <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-accent-foreground">
                  Founding members: {foundingSummary(offer, { forWhom: false })}
                </p>
              )}
            </div>
            <ul className="flex flex-col gap-2.5">
              {PRO.map((f) => (
                <li key={f} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2">
              <Button asChild size="lg" className="gap-2">
                <Link href="/pricing">
                  See Pro plans
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">{capitalise(GUARANTEE.sentence)}.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
