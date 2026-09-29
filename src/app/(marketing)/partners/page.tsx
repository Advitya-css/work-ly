import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS } from "@/lib/business";
import { joinPartnerProgramAction } from "@/lib/partner-actions";
import { PARTNER_MIN_PAYOUT_USD, PARTNER_PERCENT, partnerLink } from "@/lib/partners-core";

export const metadata: Metadata = {
  title: "Partner programme",
  description: `Recommend Work-ly to the job seekers you work with and earn ${PARTNER_PERCENT}% of what they spend.`,
};

const ERRORS: Record<string, string> = {
  terms: "Tick the box to agree to the partner terms.",
  details: "Add your name and a valid email address.",
  busy: "Too many sign-ups from this connection. Please try again in an hour.",
};

const TERMS = [
  `You earn ${PARTNER_PERCENT}% of every purchase (Pro plans, the Sprint, gift passes and seat packs) that people make within 90 days of first coming to Work-ly through your link. Monthly renewals after the first payment aren't included.`,
  "The first link that brings someone to Work-ly is the one that counts. It's remembered on their device, so a purchase on another device can't be credited.",
  `Paid monthly by PayPal or bank transfer once you've earned $${PARTNER_MIN_PAYOUT_USD}. Refunded orders and your own purchases don't count.`,
  "Share it honestly: no spam, no paid ads on the Work-ly name, no coupon sites, and never promise anyone a job.",
  "Either of us can end the arrangement at any time; commission already earned is still paid.",
];

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.work-ly.in").replace(/\/$/, "");
}

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ joined?: string; error?: string }> }) {
  const { joined, error } = await searchParams;
  const slug = joined && /^[a-z0-9-]{1,40}$/.test(joined) ? joined : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Partner programme</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Recommend Work-ly, earn {PARTNER_PERCENT}% of what your people spend
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          For career coaches, resume writers, mentors and communities. Get a personal link in a minute - no account needed.
          Prefer to give your clients seats directly? See the{" "}
          <Link href="/for-coaches" className="text-foreground underline underline-offset-2">
            Coach pack
          </Link>
          .
        </p>
      </header>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="terms" className="flex flex-col gap-4">
          <h2 id="terms" className="text-2xl font-semibold tracking-tight text-foreground">
            How it works
          </h2>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            {TERMS.map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Questions?{" "}
            <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}?subject=Partner%20programme`}>
              {BUSINESS.supportEmail}
            </a>
          </p>
        </section>

        <section id="join" aria-labelledby="join-title" className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
          {slug ? (
            <>
              <h2 id="join-title" className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <Link2 className="size-5 text-primary" aria-hidden />
                Your partner link
              </h2>
              <p className="break-all rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 font-mono text-sm text-foreground select-all">
                {partnerLink(siteUrl(), slug)}
              </p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve emailed it to you too. Reply to that email with how you&apos;d like to be paid. Any Work-ly page works
                with the same ending, for example work-ly.in/free-grader?ref=partner-{slug}.
              </p>
            </>
          ) : (
            <>
              <h2 id="join-title" className="text-xl font-semibold text-foreground">
                Get your link
              </h2>
              <form action={joinPartnerProgramAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Your name or business name</Label>
                  <Input id="name" name="name" required minLength={2} maxLength={60} placeholder="e.g. Jane Smith Coaching" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required maxLength={200} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="site">Website or profile (optional)</Label>
                  <Input id="site" name="site" maxLength={200} placeholder="https://" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="how">Who will you share it with? (optional)</Label>
                  <Textarea id="how" name="how" rows={3} maxLength={300} />
                </div>
                <div aria-hidden className="hidden">
                  <label>
                    Company website <input name="company_website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  <input type="checkbox" name="accept_terms" required className="mt-0.5 size-4 shrink-0 accent-primary" />
                  <span>I agree to the partner terms on this page.</span>
                </label>
                <Button type="submit" size="lg">
                  Get my partner link
                </Button>
                {error && ERRORS[error] && (
                  <p role="alert" className="text-sm text-destructive">
                    {ERRORS[error]}
                  </p>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
