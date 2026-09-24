"use client";

import { CheckCircle2, Sparkles, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { UpgradeButton } from "./upgrade-button";

type Interval = "monthly" | "quarterly" | "yearly";

interface Plan {
  interval: Interval;
  name: string;
  tagline: string;
  price: string;
  /** Shown after the price, e.g. "/mo". */
  priceSuffix?: string;
  /** A struck-through comparison price. */
  compareAt?: string;
  /** The line under the price ("Just $16.67/mo", "Save 37%"). */
  note?: { text: string; tone: "primary" | "success" };
  terms: string;
  features: string[];
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    interval: "monthly",
    name: "Monthly",
    tagline: "Pay as you go",
    price: "$19.99",
    priceSuffix: "/mo",
    terms: "Auto-renews. Cancel anytime.",
    features: ["Unlimited AI job analyses", "AI resume tailoring", "The Dream Pathway", "Interview simulator"],
  },
  {
    interval: "quarterly",
    name: "3-Month Pass",
    tagline: "Perfect for a focused hunt",
    price: "$49.99",
    note: { text: "Just $16.67/mo", tone: "primary" },
    terms: "One-time payment. No auto-renew.",
    features: ["Everything in Monthly", "3 full months of access", "No subscription to cancel"],
    featured: true,
  },
  {
    interval: "yearly",
    name: "Yearly Pass",
    tagline: "For students & career switchers",
    price: "$149.99",
    compareAt: "$240",
    note: { text: "Save 37%", tone: "success" },
    terms: "One-time payment. No auto-renew.",
    features: ["Everything in Monthly", "12 full months of access", "No subscription to cancel"],
  },
];

/**
 * Pricing for Work-ly Pro.
 *
 * Layout follows the space the card actually has, not the window: this
 * component sits in Settings next to the sidebar, where a 1024px window can
 * leave only ~700px, so viewport breakpoints put three columns into far too
 * little room (clipped prices and buttons). Container queries decide instead:
 *   - narrow  (< 48rem): one column, the recommended pass first, cards capped
 *     at a comfortable reading width and centred;
 *   - wide    (>= 48rem): three columns, the pass in the middle.
 */
export function PricingCard() {
  return (
    <section aria-labelledby="pricing-heading" className="@container w-full">
      <div className="mb-8 text-center">
        <h2 id="pricing-heading" className="flex items-center justify-center gap-2 text-2xl font-bold text-balance @md:text-3xl">
          <Sparkles className="size-6 shrink-0 text-primary" />
          Work-ly Pro
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground text-balance @md:text-base">
          Get the ultimate unfair advantage in your job hunt.
        </p>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-1 gap-5 @3xl:max-w-5xl @3xl:grid-cols-3 @3xl:items-stretch @3xl:gap-4 @5xl:gap-6">
        {PLANS.map((plan) => (
          <PlanCard key={plan.interval} plan={plan} />
        ))}
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        // No overflow-hidden: the "Most popular" badge sits on the border.
        "relative flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground",
        plan.featured
          ? "order-first border-primary bg-gradient-to-b from-primary/10 to-card shadow-md @3xl:order-none @3xl:-my-2"
          : "border-border shadow-sm transition-colors hover:border-primary/30",
      )}
    >
      {plan.featured && (
        <div className="absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
          <Star className="size-3 fill-current" aria-hidden />
          Most popular
        </div>
      )}

      <div className={cn("flex flex-col gap-1 px-5 pt-6 @5xl:px-6", plan.featured && "pt-7")}>
        <h3 className="text-lg font-semibold leading-tight @5xl:text-xl">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-3xl font-bold tracking-tight tabular-nums @5xl:text-4xl">{plan.price}</span>
          {plan.priceSuffix && <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>}
          {plan.compareAt && (
            <span className="text-base text-muted-foreground tabular-nums line-through">
              <span className="sr-only">Was </span>
              {plan.compareAt}
            </span>
          )}
        </div>
        {plan.note && (
          <p
            className={cn(
              "text-sm font-medium",
              plan.note.tone === "primary" ? "text-primary" : "text-green-600 dark:text-green-400",
            )}
          >
            {plan.note.text}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{plan.terms}</p>
      </div>

      <ul className="flex flex-1 flex-col gap-3 px-5 py-5 text-sm font-medium @5xl:px-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-px size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="px-5 pb-5 @5xl:px-6 @5xl:pb-6">
        <UpgradeButton interval={plan.interval} fullWidth variant={plan.featured ? undefined : "outline"} />
      </div>
    </div>
  );
}
