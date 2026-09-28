import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isOfferKey, type OfferKey } from "@/lib/payments/offers";
import { createOfferCheckout } from "@/lib/payments/offer-checkout";
import { getSprintSpots } from "@/lib/sprint";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * BUY AN OFFER - the Sprint, a seat pack or a gift (lib/payments/offers.ts).
 *
 * A plain form POST from the offer's page: checks the Terms box was ticked,
 * sends the Sprint to sign-in first (it's for the buyer's own account) and
 * refuses it when every spot is taken, then hands over to Polar checkout.
 * Seat packs and gifts don't need an account: the code is emailed to the
 * address used at checkout and shown on the thank-you page.
 */

const PAGE_FOR: Record<OfferKey, string> = {
  sprint: "/sprint",
  coach: "/for-coaches",
  pilot: "/for-teams",
  licence: "/for-teams",
  gift: "/gift",
};

function back(req: Request, key: OfferKey, error: string): NextResponse {
  const url = new URL(PAGE_FOR[key], req.url);
  url.searchParams.set("error", error);
  url.hash = "buy";
  return NextResponse.redirect(url, 303);
}

export async function GET(req: Request, { params }: { params: Promise<{ offer: string }> }) {
  const { offer } = await params;
  return NextResponse.redirect(new URL(isOfferKey(offer) ? PAGE_FOR[offer] : "/pricing", req.url), 303);
}

export async function POST(req: Request, { params }: { params: Promise<{ offer: string }> }) {
  const { offer } = await params;
  if (!isOfferKey(offer)) return NextResponse.redirect(new URL("/pricing", req.url), 303);

  const form = await req.formData().catch(() => null);
  if (form?.get("accept_terms") !== "on") return back(req, offer, "terms");

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const allowed = await checkRateLimit(`buy:${ip}`, 20, 60 * 60).catch(() => true);
  if (!allowed) return back(req, offer, "busy");

  const user = await getCurrentUser();
  if (offer === "sprint") {
    if (!user) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", "/sprint#buy");
      return NextResponse.redirect(login, 303);
    }
    const spots = await getSprintSpots();
    if (spots.open <= 0) return back(req, offer, "full");
  }

  const result = await createOfferCheckout(offer, user ? { id: user.id, email: user.email } : null);
  if ("url" in result) return NextResponse.redirect(result.url, 303);
  return back(req, offer, result.error === "not_for_sale" ? "unavailable" : "failed");
}
