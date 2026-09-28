import type { Metadata } from "next";
import { Gift } from "lucide-react";

import { BuyForm } from "@/components/offers/buy-form";
import { OFFERS } from "@/lib/payments/offers";

export const metadata: Metadata = {
  title: "Gift a 3-Month Pass",
  description: `Give someone who's job hunting 3 months of Work-ly Pro for ${OFFERS.gift.price}. The pass starts when they redeem it.`,
};

const gift = OFFERS.gift;

export default async function GiftPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Gift className="size-8 text-primary" aria-hidden />
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
          Help someone&apos;s job search
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Give a friend, a graduate or someone just laid off 3 months of Work-ly Pro: a resume and cover letter tailored to
          each job, interview practice, and new listings matched every night.
        </p>
      </header>
      <div id="buy" className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-primary/30 bg-card p-6 shadow-sm">
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums">{gift.price}</span>
          <span className="text-sm text-muted-foreground">one payment, nothing renews</span>
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
          <li>You get a code by email right after checkout, to pass on however you like.</li>
          <li>Their 3 months start when they redeem it, not when you buy.</li>
          <li>Their account and everything in it is private to them.</li>
        </ul>
        <BuyForm offer="gift" error={error} label={`Buy a gift pass · ${gift.price}`} />
        <p className="text-xs text-muted-foreground">Full refund within 14 days if the code hasn&apos;t been redeemed.</p>
      </div>
    </div>
  );
}
