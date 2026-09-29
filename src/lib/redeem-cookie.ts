/**
 * A CODE WAITING TO BE REDEEMED - pure, so the proxy (Edge) can use it.
 *
 * Someone opens work-ly.in/redeem?code=TEAM-... without an account. Sign-up
 * then goes through email verification and onboarding, and a return URL
 * doesn't survive that trip. So the proxy keeps the code in a cookie for a
 * week, and every signed-in page shows "You have a code - redeem it" until
 * it's used.
 */

export const REDEEM_COOKIE = "wl_redeem";
export const REDEEM_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

export function cleanRedeemCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9#-]{4,40}$/.test(code) ? code : null;
}
