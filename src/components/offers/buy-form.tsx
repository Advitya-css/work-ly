import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LegalLinks } from "@/components/legal/legal-links";
import { BUSINESS } from "@/lib/business";
import { OFFERS, offerProductId, type OfferKey } from "@/lib/payments/offers";
import { cn } from "@/lib/utils";

/**
 * The buy button for an offer (lib/payments/offers.ts): a plain form that
 * posts to /buy/<offer>, with the Terms box every checkout needs. Works
 * without JavaScript. When the offer's Polar product isn't set up yet it
 * says so and offers email instead of a button that would fail.
 */

const ERRORS: Record<string, string> = {
  terms: "Tick the box to agree to the Terms and Refund policy first.",
  full: `Every Sprint spot is taken right now. Email ${BUSINESS.supportEmail} and you'll get the next one.`,
  unavailable: `This isn't on sale online yet. Email ${BUSINESS.supportEmail} and I'll set it up for you directly.`,
  failed: "Checkout couldn't open just now. Please try again in a moment.",
  busy: "Too many tries from this connection. Please wait a few minutes.",
};

export function BuyForm({
  offer,
  label,
  error,
  disabled = false,
  disabledNote,
  className,
}: {
  offer: OfferKey;
  label?: string;
  error?: string | null;
  disabled?: boolean;
  disabledNote?: string;
  className?: string;
}) {
  const o = OFFERS[offer];
  const onSale = offerProductId(offer) !== null;
  const message = error ? (ERRORS[error] ?? null) : null;

  if (!onSale) {
    return (
      <div className={cn("flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm", className)}>
        <p className="font-medium text-foreground">
          {o.name} · {o.price}
        </p>
        <p className="text-muted-foreground">
          Online checkout for this opens shortly. Email{" "}
          <a className="text-foreground underline underline-offset-2" href={`mailto:${BUSINESS.supportEmail}?subject=${encodeURIComponent(o.name)}`}>
            {BUSINESS.supportEmail}
          </a>{" "}
          and I&apos;ll send you a payment link today.
        </p>
      </div>
    );
  }

  return (
    <form action={`/buy/${offer}`} method="post" className={cn("flex flex-col gap-3", className)}>
      <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <input type="checkbox" name="accept_terms" required className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          I agree to the{" "}
          <a href="/legal/terms" target="_blank" rel="noopener" className="text-foreground underline underline-offset-2">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/legal/refunds" target="_blank" rel="noopener" className="text-foreground underline underline-offset-2">
            Refund policy
          </a>
          .
        </span>
      </label>
      <Button type="submit" size="lg" className="w-full gap-1.5" disabled={disabled}>
        {label ?? `Buy the ${o.name} · ${o.price}`}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
      {disabled && disabledNote && <p className="text-sm text-muted-foreground">{disabledNote}</p>}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">Secure checkout by {BUSINESS.paymentProvider}. Prices in US dollars; tax may be added.</p>
      <LegalLinks />
    </form>
  );
}
