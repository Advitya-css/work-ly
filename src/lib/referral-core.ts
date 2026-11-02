/**
 * INVITE A FRIEND - pure parts (the proxy runs these too).
 *
 * The deal: when someone you invited buys Pro, you both get two extra weeks
 * of Pro. Nothing is given for a signup or an upload any more: the old
 * "free month for uploading a resume" handed Pro to accounts that never
 * paid, which is the opposite of what Work-ly needs right now.
 *
 * An invite link is the home page with ?invite=<your account id>, so a
 * friend lands on the free check first, not on a signup form. The proxy
 * keeps the id in a cookie until they sign up (email or Google).
 */

export const REFERRAL_BONUS_DAYS = 14;
/** A referrer earns at most this many bonuses a year. */
export const MAX_REFERRAL_BONUSES_PER_YEAR = 12;

/** The cookie that carries an invite to signup (shared with the Google sign-in route). */
export const REF_COOKIE = "workly_ref";
export const REF_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

/** Account ids are uuids; anything else in ?invite= is ignored. */
export function cleanInviteCode(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

export function inviteLink(baseUrl: string, userId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/?invite=${encodeURIComponent(userId)}`;
}

/**
 * The referredBy column holds the referrer's id, plus a marker once the
 * referral has been rewarded: "|credited" for the old signup reward, "|paid"
 * for the purchase reward. Either marker means "done, never again".
 */
export const PAID_MARKER = "|paid";
export const OLD_CREDITED_MARKER = "|credited";

export function referrerOf(referredBy: string | null | undefined): { id: string; rewarded: boolean } | null {
  if (!referredBy) return null;
  for (const marker of [PAID_MARKER, OLD_CREDITED_MARKER]) {
    if (referredBy.endsWith(marker)) return { id: referredBy.slice(0, -marker.length), rewarded: true };
  }
  return { id: referredBy, rewarded: false };
}

/** Plans someone paid for (bonus days are kept for them past every renewal). */
export const PAID_PLAN_IDS = ["monthly", "quarterly", "yearly"] as const;

export function isPaidPlan(plan: string | null | undefined): boolean {
  return (PAID_PLAN_IDS as readonly string[]).includes(plan ?? "");
}

export interface ReferralStats {
  joined: number;
  paid: number;
  weeksEarned: number;
}

export function referralLine(stats: ReferralStats): string | null {
  if (stats.joined === 0) return null;
  const joined = `${stats.joined} friend${stats.joined === 1 ? "" : "s"} joined`;
  if (stats.paid === 0) return `${joined}. None has bought Pro yet.`;
  return `${joined}, ${stats.paid} bought Pro. You've earned ${stats.weeksEarned} extra week${stats.weeksEarned === 1 ? "" : "s"}.`;
}
