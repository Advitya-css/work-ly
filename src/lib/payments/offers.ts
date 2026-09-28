/**
 * THE OFFERS THAT AREN'T A PRO PLAN - one list, so pages, checkout, the
 * webhook and the admin report can never disagree about what's for sale.
 *
 *   sprint   - the 14-day Application Sprint: a person (the founder) checks
 *              five applications with the buyer; includes 3 months of Pro
 *   coach    - 10 seats for a career coach's clients
 *   pilot    - 25 seats for a bootcamp / career-centre cohort
 *   licence  - 100 seats for a cohort, one term
 *   gift     - one 3-Month Pass bought for someone else
 *
 * Seat offers are paid once and delivered as ONE code that up to `seats`
 * people redeem at /redeem, each getting `months` of Pro on their own
 * account. Each product lives in Polar; its id is set in the environment
 * (the variable named in `envVar`). An offer whose product isn't set is
 * simply not sold - its buy button explains that instead of failing.
 */

export type OfferKey = "sprint" | "coach" | "pilot" | "licence" | "gift";

export interface Offer {
  key: OfferKey;
  name: string;
  priceUsd: number;
  /** "$149" - whole dollars shown without cents. */
  price: string;
  /** Environment variable holding the Polar product id. */
  envVar: string;
  /** People who can redeem the code (0 = not a seat offer). */
  seats: number;
  /** Months of Pro each seat (or the Sprint buyer) gets. */
  months: number;
  /** Must the buyer be signed in? (The Sprint is for their own account.) */
  requiresAccount: boolean;
  /** One line for receipts, admin and the checkout page. */
  summary: string;
}

function usd(n: number): string {
  return Number.isInteger(n) ? `$${n.toLocaleString("en-US")}` : `$${n.toFixed(2)}`;
}

function offer(o: Omit<Offer, "price">): Offer {
  return { ...o, price: usd(o.priceUsd) };
}

export const OFFERS: Record<OfferKey, Offer> = {
  sprint: offer({
    key: "sprint",
    name: "Application Sprint",
    priceUsd: 149,
    envVar: "POLAR_SPRINT_PRODUCT_ID",
    seats: 0,
    months: 3,
    requiresAccount: true,
    summary: "14 days: five applications checked with you by a person, plus 3 months of Pro",
  }),
  coach: offer({
    key: "coach",
    name: "Coach pack",
    priceUsd: 250,
    envVar: "POLAR_COACH_PACK_PRODUCT_ID",
    seats: 10,
    months: 3,
    requiresAccount: false,
    summary: "10 seats, each 3 months of Pro for one client",
  }),
  pilot: offer({
    key: "pilot",
    name: "Cohort pilot",
    priceUsd: 750,
    envVar: "POLAR_COHORT_PILOT_PRODUCT_ID",
    seats: 25,
    months: 3,
    requiresAccount: false,
    summary: "25 seats for 3 months, an onboarding call and a usage report",
  }),
  licence: offer({
    key: "licence",
    name: "Cohort licence",
    priceUsd: 2500,
    envVar: "POLAR_COHORT_LICENCE_PRODUCT_ID",
    seats: 100,
    months: 3,
    requiresAccount: false,
    summary: "100 seats for a term (3 months), a usage report and one live workshop",
  }),
  gift: offer({
    key: "gift",
    name: "Gift a 3-Month Pass",
    priceUsd: 49.99,
    envVar: "POLAR_GIFT_PRODUCT_ID",
    seats: 1,
    months: 3,
    requiresAccount: false,
    summary: "One 3-Month Pass for someone who is job hunting",
  }),
};

export const OFFER_KEYS = Object.keys(OFFERS) as OfferKey[];

/** Seat offers, smallest first - for the coach and team pages. */
export const SEAT_OFFERS: Offer[] = [OFFERS.coach, OFFERS.pilot, OFFERS.licence];

export function isOfferKey(value: unknown): value is OfferKey {
  return typeof value === "string" && (OFFER_KEYS as string[]).includes(value);
}

export function offerProductId(key: OfferKey, env: Record<string, string | undefined> = process.env): string | null {
  const id = env[OFFERS[key].envVar]?.trim();
  return id ? id : null;
}

/** Which offer a Polar product is, or null (a Pro plan, or something we don't sell). */
export function offerForProduct(
  productId: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): OfferKey | null {
  if (!productId) return null;
  for (const key of OFFER_KEYS) {
    if (offerProductId(key, env) === productId) return key;
  }
  return null;
}

/** "$25 a seat" for a seat offer. */
export function perSeat(o: Offer): string | null {
  if (o.seats <= 1) return null;
  return `${usd(Math.round((o.priceUsd / o.seats) * 100) / 100)} a seat`;
}
