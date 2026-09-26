import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BUSINESS } from "@/lib/business";
import { FREE_FEATURES, PAID_PLANS, PRO_FEATURES, YEARLY_ONLY_FEATURES } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    `Work-ly pricing: free to start, $19.99/month, a $49.99 3-month pass or a $149.99 yearly pass. Every paid plan has a ${BUSINESS.refundDays}-day money-back guarantee.`,
};

const FAQ = [
  {
    q: "Is the Monthly plan a subscription?",
    a: "Yes. Monthly renews every month until you cancel. Cancel anytime from Settings → Plan & Billing or by email; you keep Pro until the end of the month you've paid for, and you won't be charged again.",
  },
  {
    q: "Do the 3-Month and Yearly passes renew?",
    a: "No. They're one-time payments. You get Pro for 3 or 12 months from the day you buy, then your account returns to the free plan. Nothing renews and there's nothing to cancel.",
  },
  {
    q: "What if it isn't for me?",
    a: `Every paid plan has a ${BUSINESS.refundDays}-day money-back guarantee: email us within ${BUSINESS.refundDays} days of your first purchase and we refund it in full, as long as you've used fewer than ${BUSINESS.refundUsageLimit} Pro AI tools - enough to try everything, not to run a whole job search. Settings shows your count. The details are in our refund policy.`,
  },
  {
    q: "What happens to my data when Pro ends?",
    a: "Nothing is deleted. Your profile, applications and everything the tools produced stay in your account; the Pro tools simply lock again until you upgrade. You can delete your data yourself at any time.",
  },
  {
    q: "Which currency, and are taxes included?",
    a: "Prices are in US dollars. Depending on where you live, sales tax or VAT may be added at checkout, and your bank may convert the amount to your currency.",
  },
  {
    q: "Is Work-ly a job board or a recruiter?",
    a: "No. Work-ly is software you use for your own career. Our only customers are individuals. We don't charge employers, sell or post job listings, place candidates, or run ads.",
  },
  {
    q: "Does Work-ly guarantee I'll get a job?",
    a: "No, and nobody honest can. Work-ly helps you prepare better applications and interviews; the scores describe how your profile matches a role's stated requirements, not your chances of being hired.",
  },
];

/**
 * The public pricing page. Every figure comes from lib/pricing.ts - the same
 * data the in-app pricing cards use - so the two can never disagree.
 */
export default function PricingPage() {
  const cards = [
    {
      key: "free",
      name: "Free",
      tagline: "Everything you need to start",
      price: "$0",
      priceSuffix: undefined as string | undefined,
      compareAt: undefined as string | undefined,
      note: undefined as { text: string; tone: "primary" | "success" } | undefined,
      terms: "Free forever. No card needed.",
      features: FREE_FEATURES,
      featured: false,
      cta: { label: "Start free", href: "/signup" },
    },
    ...PAID_PLANS.map((plan) => ({
      key: plan.interval,
      name: plan.name,
      tagline: plan.tagline,
      price: plan.price,
      priceSuffix: plan.priceSuffix,
      compareAt: plan.compareAt,
      note: plan.note,
      terms: plan.terms,
      features: plan.features,
      featured: Boolean(plan.featured),
      // Checkout needs an account: signed-in visitors land on the plans in
      // Settings; everyone else signs in (or signs up from there) first.
      cta: { label: `Get ${plan.name}`, href: `/upgrade?plan=${plan.interval}` },
    })),
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16">
      <header className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">Simple, honest pricing</h1>
        <p className="text-balance text-muted-foreground">
          Start free. Upgrade when you&apos;re applying seriously. Every paid plan comes with a {BUSINESS.refundDays}-day
          money-back guarantee.
        </p>
      </header>

      <section aria-label="Plans" className="@container">
        <ul className="mx-auto grid max-w-md grid-cols-1 gap-5 @3xl:max-w-none @3xl:grid-cols-2 @5xl:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.key}
              className={cn(
                "relative flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground",
                card.featured ? "order-first border-primary shadow-md @3xl:order-none" : "border-border shadow-sm",
              )}
            >
              {card.featured && (
                <span className="absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  <Star className="size-3 fill-current" aria-hidden />
                  Most popular
                </span>
              )}
              <div className="flex flex-col gap-1 px-5 pt-6">
                <h2 className="text-lg font-semibold">{card.name}</h2>
                <p className="text-sm text-muted-foreground">{card.tagline}</p>
                <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">{card.price}</span>
                  {card.priceSuffix && <span className="text-sm text-muted-foreground">{card.priceSuffix}</span>}
                  {card.compareAt && (
                    <span className="text-base text-muted-foreground tabular-nums line-through">
                      <span className="sr-only">Was </span>
                      {card.compareAt}
                    </span>
                  )}
                </p>
                {card.note && (
                  <p className={cn("text-sm font-medium", card.note.tone === "primary" ? "text-primary" : "text-success")}>
                    {card.note.text}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{card.terms}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5 px-5 py-5 text-sm">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-px size-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-5">
                <Button asChild className="w-full" variant={card.featured ? "default" : "outline"}>
                  <Link href={card.cta.href}>{card.cta.label}</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          {BUSINESS.refundDays}-day money-back guarantee on your first purchase ·{" "}
          <Link href="/legal/refunds" className="underline underline-offset-4 hover:text-foreground">
            Refund policy
          </Link>
        </p>
      </section>

      <section aria-labelledby="included" className="mx-auto grid w-full max-w-4xl gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 id="included" className="text-base font-semibold text-foreground">
            Every paid plan includes
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-px size-4 shrink-0 text-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Only with the Yearly Pass</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            {YEARLY_ONLY_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-px size-4 shrink-0 text-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">The parts of Work-ly that keep working after you&apos;re hired.</p>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto w-full max-w-3xl">
        <h2 id="faq" className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
          Questions
        </h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          By buying you agree to our{" "}
          <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/refunds" className="underline underline-offset-4 hover:text-foreground">
            Refund policy
          </Link>
          . Questions?{" "}
          <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
            Contact us
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
