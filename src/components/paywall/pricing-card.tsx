"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { UpgradeButton } from "./upgrade-button";
import { LegalLinks } from "@/components/legal/legal-links";
import { PAID_PLANS, type PaidPlan } from "@/lib/pricing";
import { BUSINESS, GUARANTEE, RECOMMENDED_BADGE } from "@/lib/business";
import { getFoundingOfferAction, getPppContextAction, getSaleAction } from "@/lib/payments/founding-actions";
import { foundingSummary, type PublicFoundingOffer } from "@/lib/payments/founding-core";
import { saleEndDay, salePriceCents, type PublicSale } from "@/lib/payments/sale-core";
import { formatDisplayPrice, type PublicPppContext } from "@/lib/payments/ppp-core";

type Plan = PaidPlan;
const PLANS = PAID_PLANS;

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
  const [ppp, setPpp] = useState<PublicPppContext | null>(null);
  const [founding, setFounding] = useState<PublicFoundingOffer | null>(null);
  const [sale, setSale] = useState<PublicSale | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPppContextAction().then((ctx) => { if (!cancelled) setPpp(ctx); }).catch(() => undefined);
    getFoundingOfferAction().then((o) => { if (!cancelled) setFounding(o); }).catch(() => undefined);
    getSaleAction().then((s) => { if (!cancelled) setSale(s); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const pppPct = ppp?.offer && (!founding || ppp.offer.percentOff >= founding.percentOff) ? ppp.offer.percentOff : 0;
  const displayCountry = ppp?.displayCountryCode ?? ppp?.countryCode ?? null;
  const sampleLocal = formatDisplayPrice(49.99, pppPct, displayCountry);

  return (
    <section aria-labelledby="pricing-heading" className="@container w-full">
      <div className="mb-8 text-center">
        <h2 id="pricing-heading" className="flex items-center justify-center gap-2 text-2xl font-bold text-balance @md:text-3xl">
          <Sparkles className="size-6 shrink-0 text-primary" />
          Work-ly Pro
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground text-balance @md:text-base">
          Every AI career tool, with a {GUARANTEE.sentence}.
        </p>
        {sale && (
          <p className="mx-auto mt-3 max-w-xl rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            <span className="font-semibold">{sale.name}:</span> applied automatically at checkout until {saleEndDay(sale.endsAt)}.
          </p>
        )}
        {founding && pppPct === 0 && (
          <p className="mx-auto mt-3 max-w-xl rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            <span className="font-semibold">Founding members:</span> {foundingSummary(founding, { forWhom: false })}. Applied automatically at checkout.
          </p>
        )}
        {ppp?.offer && pppPct > 0 && (
          <p className="mx-auto mt-3 max-w-xl rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            <span className="font-semibold">Regional pricing ({ppp.countryName}):</span> {ppp.offer.percentOff}% off applied automatically at checkout.
          </p>
        )}
        {ppp && !ppp.covered && ppp.countryName && (
          <p className="mx-auto mt-3 max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
            Sorry, we don&apos;t cover {ppp.countryName} for local job discovery yet — coming soon. Pasting any job posting and remote checks still work everywhere.
          </p>
        )}
      </div>

      <div className="mx-auto grid max-w-md grid-cols-1 gap-5 @3xl:max-w-5xl @3xl:grid-cols-3 @3xl:items-stretch @3xl:gap-4 @5xl:gap-6">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.interval}
            plan={plan}
            pppPct={pppPct}
            displayCountry={displayCountry}
            sale={sale}
          />
        ))}
      </div>
      {sampleLocal.isLocalCurrency && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Prices shown in approximate {sampleLocal.currencyCode}; checkout settles in USD.
        </p>
      )}
      <LegalLinks className="mt-4" />
    </section>
  );
}

function PlanCard({
  plan,
  pppPct,
  displayCountry,
  sale,
}: {
  plan: Plan;
  pppPct: number;
  displayCountry: string | null;
  sale: PublicSale | null;
}) {
  const isSalePlan = sale?.plan === plan.interval;
  const activeUsd = isSalePlan
    ? salePriceCents(plan.priceUsd, sale) / 100
    : plan.priceUsd;
  const pct = isSalePlan ? 0 : pppPct;
  const current = formatDisplayPrice(activeUsd, pct, displayCountry);
  const full = formatDisplayPrice(plan.compareAt ? Number(plan.compareAt.replace(/[^0-9.]/g, "")) : plan.priceUsd, 0, displayCountry);
  const showCompareAt = Boolean(plan.compareAt) || pct > 0 || isSalePlan;
  const compareDisplay =
    pct > 0 || isSalePlan ? formatDisplayPrice(plan.priceUsd, 0, displayCountry).primary : full.primary;
  const quarterlyMonthly = plan.interval === "quarterly" ? formatDisplayPrice(16.67, pct, displayCountry) : null;

  return (
    <div
      className={cn(
        // No overflow-hidden: the recommended-plan badge sits on the border.
        "relative flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground",
        plan.featured
          ? "order-first border-primary/70 bg-card shadow-md ring-1 ring-primary/15 @3xl:order-none @3xl:-my-2"
          : "border-border shadow-sm transition-colors hover:border-primary/30",
      )}
    >
      {plan.featured && (
        <div className="absolute top-0 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
          <Star className="size-3 fill-current" aria-hidden />
          {RECOMMENDED_BADGE}
        </div>
      )}

      <div className={cn("flex flex-col gap-1 px-5 pt-6 @5xl:px-6", plan.featured && "pt-7")}>
        <h3 className="text-lg font-semibold leading-tight @5xl:text-xl">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-3xl font-bold tracking-tight tabular-nums @5xl:text-4xl">{current.primary}</span>
          {plan.priceSuffix && <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>}
          {showCompareAt && (
            <span className="text-base text-muted-foreground tabular-nums line-through">
              <span className="sr-only">Was </span>
              {compareDisplay}
            </span>
          )}
        </div>
        {current.isLocalCurrency && (
          <p className="text-xs text-muted-foreground">
            {current.usd}{plan.priceSuffix ?? ""} at checkout
          </p>
        )}
        {quarterlyMonthly ? (
          <p className="text-sm font-medium text-primary">
            Just {quarterlyMonthly.primary}/mo
          </p>
        ) : pct > 0 && plan.interval === "yearly" ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Save {pct}%
          </p>
        ) : plan.note ? (
          <p
            className={cn(
              "text-sm font-medium",
              plan.note.tone === "primary" ? "text-primary" : "text-green-600 dark:text-green-400",
            )}
          >
            {plan.note.text}
          </p>
        ) : null}
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
