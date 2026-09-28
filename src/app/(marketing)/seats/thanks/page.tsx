import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";

import { BUSINESS } from "@/lib/business";
import { OFFERS } from "@/lib/payments/offers";
import { lookUpOfferCheckout } from "@/lib/payments/offer-checkout";
import { redeemUrl } from "@/lib/payments/seat-codes-core";

export const metadata: Metadata = { title: "Your code", robots: { index: false } };
export const dynamic = "force-dynamic";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.work-ly.in").replace(/\/$/, "");
}

/**
 * Where seat-pack and gift buyers land after checkout. Confirms the order
 * with Polar, creates the code if the webhook hasn't yet, and shows it.
 * The same code is emailed to the address used at checkout.
 */
export default async function SeatsThanksPage({ searchParams }: { searchParams: Promise<{ checkout_id?: string }> }) {
  const { checkout_id: checkoutId } = await searchParams;
  const result = checkoutId ? await lookUpOfferCheckout(checkoutId) : ({ status: "none" } as const);

  if (result.status !== "delivered" || result.delivery.kind !== "seats") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Thanks for your order</h1>
        <p className="flex items-start gap-2 text-muted-foreground">
          <Clock className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
          {result.status === "pending"
            ? "Your payment is still being confirmed. Refresh this page in a minute to see your code - it's also on its way to your email."
            : `Your code is on its way to the email you used at checkout. If it hasn't arrived in 10 minutes, email ${BUSINESS.supportEmail}.`}
        </p>
      </div>
    );
  }

  const { group } = result.delivery;
  const offer = OFFERS[result.key];
  const link = redeemUrl(siteUrl(), group.group);
  const gift = result.key === "gift";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
          <CheckCircle2 className="size-7 text-primary" aria-hidden />
          {gift ? "Your gift is ready" : `Your ${offer.name} is ready`}
        </h1>
        <p className="text-muted-foreground">
          {gift
            ? "Give this code to the person you're gifting. They get 3 months of Work-ly Pro, starting when they redeem it."
            : `One code covers all ${group.seats} seats. Each person gets ${group.months} months of Work-ly Pro on their own account, starting when they redeem it.`}
        </p>
      </div>

      <p className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-center font-mono text-2xl font-bold tracking-widest text-foreground select-all">
        {group.group}
      </p>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 text-sm">
        <p className="font-medium text-foreground">How to use it</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground">
          <li>
            Share this link: <span className="break-all text-foreground select-all">{link}</span>
          </li>
          <li>They sign up (or sign in), and the code unlocks Pro on their account.</li>
          <li>
            {gift
              ? "That's it - nothing renews."
              : "Their resumes and applications stay private to them. Ask me any time for a count of seats used."}
          </li>
        </ol>
      </div>

      <p className="text-sm text-muted-foreground">
        We&apos;ve also emailed the code{result.email ? ` to ${result.email}` : ""}. Questions, or want an onboarding call?{" "}
        <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}`}>
          {BUSINESS.supportEmail}
        </a>
        .
      </p>
      <Link href="/" className="text-sm text-primary underline underline-offset-2">
        Back to Work-ly
      </Link>
    </div>
  );
}
