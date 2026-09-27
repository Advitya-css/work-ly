/**
 * THE FOUNDING-MEMBER OFFER - pure parts, so they can be tested.
 *
 * The offer itself lives in Polar as a discount (percentage off, a cap on
 * redemptions, an end date). Work-ly only reads it: the banner, the spots
 * left and the deadline all come from that one discount, so the site can
 * never advertise a deal Polar won't honour at checkout. No discount set
 * (POLAR_FOUNDING_DISCOUNT_ID), or it has run out or ended = no offer shown.
 */

export interface FoundingOffer {
  discountId: string;
  /** 40 for 40% off. */
  percentOff: number;
  /** Polar's discount duration: "once" = first payment only (for Monthly, the first month). */
  duration: "once" | "forever" | "repeating";
  durationInMonths: number | null;
  spotsTotal: number | null;
  spotsLeft: number | null;
  /** ISO string, so the offer can cross to client components. */
  endsAt: string | null;
}

/** What the browser gets: everything but Polar's discount id. */
export type PublicFoundingOffer = Omit<FoundingOffer, "discountId">;

/** The fields of a Polar discount this reads (percentage discounts only). */
export interface PolarDiscountLike {
  id: string;
  type?: string;
  basisPoints?: number;
  duration?: string;
  durationInMonths?: number | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  maxRedemptions?: number | null;
  redemptionsCount?: number;
}

export function foundingFromDiscount(d: PolarDiscountLike | null | undefined, now = new Date()): FoundingOffer | null {
  if (!d || typeof d.basisPoints !== "number" || d.basisPoints <= 0) return null;
  const startsAt = d.startsAt ? new Date(d.startsAt) : null;
  const endsAt = d.endsAt ? new Date(d.endsAt) : null;
  if (startsAt && startsAt.getTime() > now.getTime()) return null;
  if (endsAt && endsAt.getTime() <= now.getTime()) return null;
  const total = d.maxRedemptions ?? null;
  const used = d.redemptionsCount ?? 0;
  if (total != null && used >= total) return null;
  const duration = d.duration === "forever" || d.duration === "repeating" ? d.duration : "once";
  return {
    discountId: d.id,
    percentOff: Math.round(d.basisPoints / 100),
    duration,
    durationInMonths: d.durationInMonths ?? null,
    spotsTotal: total,
    spotsLeft: total == null ? null : Math.max(0, total - used),
    endsAt: endsAt ? endsAt.toISOString() : null,
  };
}

/** $149.99 at 40% off -> "$89.99" (rounded down to the cent, as a price should never be overstated). */
export function discountedPrice(priceUsd: number, percentOff: number): string {
  const cents = Math.floor(Math.round(priceUsd * 100) * (1 - percentOff / 100));
  return `$${(cents / 100).toFixed(2)}`;
}

/** What the discount means for a renewing plan: "first month", "every month", "first 3 months". */
export function renewingDiscountTerm(offer: PublicFoundingOffer): string {
  if (offer.duration === "forever") return "every month";
  if (offer.duration === "repeating" && offer.durationInMonths && offer.durationInMonths > 1) {
    return `first ${offer.durationInMonths} months`;
  }
  return "first month";
}

/** "27 Oct" */
export function shortDeadline(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "40% off for founding members · 23 of 50 spots left · ends 27 Oct" */
export function foundingSummary(offer: PublicFoundingOffer, { forWhom = true }: { forWhom?: boolean } = {}): string {
  const parts = [`${offer.percentOff}% off${forWhom ? " for founding members" : ""}`];
  if (offer.spotsLeft != null && offer.spotsTotal != null) parts.push(`${offer.spotsLeft} of ${offer.spotsTotal} spots left`);
  const deadline = shortDeadline(offer.endsAt);
  if (deadline) parts.push(`ends ${deadline}`);
  return parts.join(" · ");
}

/** "Founding price: $89.99" / "Founding price: $11.99 for your first month" */
export function foundingPriceLine(plan: { priceUsd: number; renews: boolean }, offer: PublicFoundingOffer): string {
  const price = discountedPrice(plan.priceUsd, offer.percentOff);
  if (!plan.renews || offer.duration === "forever") return `Founding price: ${price}${plan.renews ? "/mo" : ""}`;
  return `Founding price: ${price} for your ${renewingDiscountTerm(offer)}`;
}
